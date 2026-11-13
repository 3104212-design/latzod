// צילומי מסך של האפליקציה בטלפון מדומה, בדפדפן Edge/Chrome נסתר (בלי חלון), עם נתוני דמו.
// לבדיקת עיצוב כשחלון הדפדפן המובנה מוסתר. דורש שרת פיתוח פעיל.
//   node scripts/shoot.mjs <out-dir> [base] [routes=#/,#/clean,...] [--dark] [--size=xlarge] [--width=390] [--noseed]   (ב-Git Bash: MSYS_NO_PATHCONV=1)
// כל מסלול יכול לכלול פעולה אחרי "|": "#/clean|.stats > button" לוחץ על הרכיב, "#/|walk" פותח את הצעידה.
// פרופיל זמני ונפרד: לא נוגע בנתונים של אף אחד.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const out = args[0];
const base = args.find((a) => a.startsWith('http')) ?? 'http://[::1]:5180';
const routesArg = args.find((a) => a.startsWith('#'));
const dark = args.includes('--dark');
const noSeed = args.includes('--noseed'); // משתמש חדש: מסך הכניסה בהזמנה
const size = args.find((a) => a.startsWith('--size='))?.slice(7);
const width = Number(args.find((a) => a.startsWith('--width='))?.slice(8) ?? 390);
const height = Math.round(width * 2.16);
const routes = (routesArg ?? '#/,#/|walk,#/clean,#/path,#/journal,#/more').split(',');

const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const exe = browsers.find((b) => existsSync(b));
if (!exe) throw new Error('no Chrome/Edge found');
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'latzod-shoot-'));
const port = 9333;
const proc = spawn(exe, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {
    /* עוד לא עלה */
  }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const cdp = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;

try {
  await cdp('Page.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
  await cdp('Page.navigate', { url: `${base}/#/` });
  await sleep(1500);
  // נתוני דמו (כמו בבדיקת התצוגה), ואז טעינה מחדש
  const seeded = noSeed ? { result: { result: { value: 'skipped' } } } : await cdp('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `import('/scripts/qa-run.js').then((m) => { m.seed(); const s = JSON.parse(localStorage.getItem('latzod.v1')); s.seenVersion = '9.9.0'; s.name = 'נועה'; ${size ? `s.textSize = '${size}';` : ''} localStorage.setItem('latzod.v1', JSON.stringify(s)); return JSON.parse(localStorage.getItem('latzod.v1')).onboarded; })` });
  console.log('seed:', JSON.stringify(seeded.result?.result?.value ?? seeded.result?.exceptionDetails?.exception?.description ?? seeded));
  // רק שינוי של ה-hash לא טוען את הדף מחדש: טוענים פעם אחת כדי שהאפליקציה תקרא את נתוני הדמו
  await cdp('Page.reload');
  await sleep(1500);
  for (const [i, r] of routes.entries()) {
    const [hash, action] = r.split('|');
    await cdp('Page.navigate', { url: `${base}/${hash}` });
    await sleep(1400);
    if (action === 'walk') await evaluate(`document.querySelector('.walk-cta')?.click()`);
    // מסך הסיום של הצעידה: "לסיים לעכשיו" מסיכום הערב (חלקי)
    else if (action === 'walk:end')
      await evaluate(`document.querySelector('.walk-cta')?.click(); new Promise((r) => setTimeout(() => { document.querySelectorAll('.walk-foot')[4]?.click(); setTimeout(() => { document.querySelector('.walk-actions .walk-next')?.click(); r(); }, 300); }, 300))`);
    // מסך הסיום אחרי יום שלם: כל חמשת הצעדים נעשו, והצעידה נפתחת מ-#/walk
    else if (action === 'walk:all') {
      await evaluate(`(() => { const s = JSON.parse(localStorage.getItem('latzod.v1')); const d = new Date(); const t = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const rec = s.days[t] ?? {}; s.days[t] = { ...rec, checkin: rec.checkin ?? d.toISOString(), read: true, note: rec.note || 'בדיקה', prayed: true, review: rec.review ?? { clean: true, mood: 4, craving: 2, triggers: [], at: d.toISOString() }, done: true, doneBy: 'flow' }; localStorage.setItem('latzod.v1', JSON.stringify(s)); location.hash = '#/walk'; })()`);
      await cdp('Page.reload');
      await sleep(1500);
    } else if (action?.startsWith('walk:')) await evaluate(`document.querySelector('.walk-cta')?.click(); new Promise((r) => setTimeout(() => { document.querySelectorAll('.walk-foot')[${Number(action.slice(5))}]?.click(); r(); }, 300))`);
    else if (action === 'bisect')
      console.log('bisect:', JSON.stringify(await evaluate(`(() => { const sels = ['.bottom-nav', '.topbar', '.hero', '.page-head', '.stack > *', '.toasts', '.stack']; const out = {}; for (const sel of sels) { const els = [...document.querySelectorAll(sel)]; els.forEach((e) => (e.style.display = 'none')); out[sel] = document.documentElement.scrollWidth; els.forEach((e) => (e.style.display = '')); } const kids = [...document.querySelectorAll('.stack > *')]; out.kids = kids.map((k, i) => { k.style.display = 'none'; const w = document.documentElement.scrollWidth; k.style.display = ''; return w < 356 ? i + ':' + k.className : null; }).filter(Boolean); return out; })()`)));
    else if (action?.startsWith('to:')) await evaluate(`document.querySelector(${JSON.stringify(action.slice(3))})?.scrollIntoView({ block: 'center' })`);
    else if (action === 'scroll') await evaluate(`window.scrollTo(0, document.body.scrollHeight / 2)`);
    else if (action === 'bottom') await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
    else if (action) await evaluate(`document.querySelector(${JSON.stringify(action)})?.click()`);
    await sleep(action ? 900 : 300);
    const shot = await cdp('Page.captureScreenshot', { format: 'png' });
    const name = `${String(i + 1).padStart(2, '0')}-${(hash + (action ? '-' + action : '')).replace(/[^a-z0-9]+/gi, '_')}${dark ? '-dark' : ''}.png`;
    writeFileSync(join(out, name), Buffer.from(shot.result.data, 'base64'));
    // גלילה אופקית או רכיב רחב מהמסך: סימן לחריגה
    const geo = await evaluate(`(() => { const d = document.documentElement; const wide = [...document.querySelectorAll('body *')].map((e) => [e, e.getBoundingClientRect()]).filter(([e, r]) => (r.right > innerWidth + 1 || r.left < -1) && !e.closest('svg, .bottom-nav, .feet, .tracker-tabs') && !(e.parentElement && (() => { const p = e.parentElement.getBoundingClientRect(); return p.right > innerWidth + 1 || p.left < -1; })())).slice(0, 4).map(([e, r]) => (e.tagName + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' w' + Math.round(r.width)); return { sw: d.scrollWidth, cw: d.clientWidth, sx: Math.round(scrollX), wide }; })()`);
    console.log(name, JSON.stringify(geo));
  }
} finally {
  ws.close();
  proc.kill();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    /* הדפדפן עוד משחרר קבצים */
  }
}
