// פותח כתובת בכרום נסתר (פרופיל זמני), מחכה, ומריץ ביטוי בדף. לבדיקות חיות בלי לגעת בנתונים של אף אחד.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, expr, wait = '3000'] = process.argv.slice(2);
const profile = mkdtempSync(join(tmpdir(), 'cdp-eval-'));
const port = 9344;
const proc = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
const logs = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === 'Runtime.consoleAPICalled') logs.push('console: ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  else if (m.method === 'Runtime.exceptionThrown') logs.push('exception: ' + m.params.exceptionDetails.exception?.description);
  else if (m.method === 'Network.responseReceived' && m.params.response.url.includes('/api')) logs.push(`net: ${m.params.response.status} ${m.params.response.url}`);
  else if (m.method === 'Network.loadingFailed') logs.push(`netfail: ${m.params.errorText} ${m.params.blockedReason ?? ''} ${m.params.corsErrorStatus ? JSON.stringify(m.params.corsErrorStatus) : ''}`);
};
const cdp = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
await cdp('Runtime.enable');
await cdp('Network.enable');
await cdp('Page.navigate', { url });
await sleep(Number(wait));
const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
console.log(logs.join('\n'));
ws.close();
proc.kill();
