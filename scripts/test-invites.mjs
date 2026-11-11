// בדיקת שירות ההזמנות: מריץ אותו על פורט זמני ובודק כל מסלול.  node scripts/test-invites.mjs server/invites.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [serverFile] = process.argv.slice(2);
const dir = mkdtempSync(join(tmpdir(), 'inv-'));
const PORT = 3799;
const proc = spawn(process.execPath, [serverFile], { env: { ...process.env, PORT, STATE_DIR: dir }, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 600));
const base = `http://127.0.0.1:${PORT}/api`;
const call = async (method, path, body, auth, headers = {}) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
};
let ok = 0;
let bad = 0;
const check = (name, cond, extra) => {
  if (cond) ok++;
  else bad++;
  console.log(`${cond ? 'OK ' : 'BAD'} ${name}${cond ? '' : ' ' + JSON.stringify(extra)}`);
};

try {
  const setup = readFileSync(join(dir, 'setup-code.txt'), 'utf8').trim();
  check('setup code created', /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(setup), setup);
  check('health', (await call('GET', '/health')).status === 200);
  check('list without admin -> 401', (await call('GET', '/invites')).status === 401);
  check('create without admin -> 401', (await call('POST', '/invites', {})).status === 401);
  check('pair wrong code -> 403', (await call('POST', '/admin/pair', { setup: 'aaaa-bbbb-cccc' })).status === 403);
  const pair = await call('POST', '/admin/pair', { setup: setup.toUpperCase() });
  check('pair ok (case-insensitive)', pair.status === 200 && pair.body.token?.length === 40, pair);
  const admin = pair.body.token;
  check('setup file removed', !existsSync(join(dir, 'setup-code.txt')));
  check('pair again with same code -> 403', (await call('POST', '/admin/pair', { setup })).status === 403);
  check('bad admin token -> 401', (await call('GET', '/invites', null, 'x'.repeat(40))).status === 401);

  const inv = await call('POST', '/invites', { note: 'דנה' }, admin);
  check('create invite', inv.status === 201 && inv.body.code.length === 10 && inv.body.note === 'דנה', inv);
  const code = inv.body.code;
  const given = await call('PATCH', `/invites/${code}`, { given: true }, admin);
  check('mark given', given.status === 200 && !!given.body.givenAt, given);

  const r1 = await call('POST', '/invites/redeem', { code: ` ${code.toUpperCase()} ` });
  check('redeem ok', r1.status === 200 && r1.body.seat?.length === 24, r1);
  const seat = r1.body.seat;
  const r2 = await call('POST', '/invites/redeem', { code });
  check('second redeem -> 409 used', r2.status === 409 && r2.body.error === 'used', r2);
  check('resume with seat ok', (await call('POST', '/invites/resume', { code, seat })).status === 200);
  check('resume wrong seat -> 409', (await call('POST', '/invites/resume', { code, seat: 'z'.repeat(24) })).status === 409);
  check('resume no seat -> 409', (await call('POST', '/invites/resume', { code })).status === 409);
  check('redeem unknown -> 404', (await call('POST', '/invites/redeem', { code: 'abcdefghjk' })).status === 404);
  check('revoke used -> 409', (await call('DELETE', `/invites/${code}`, null, admin)).status === 409);

  const inv2 = (await call('POST', '/invites', {}, admin)).body.code;
  check('revoke unused ok', (await call('DELETE', `/invites/${inv2}`, null, admin)).status === 200);
  check('redeem revoked -> 404', (await call('POST', '/invites/redeem', { code: inv2 })).status === 404);

  const list = await call('GET', '/invites', null, admin);
  const one = list.body.invites.find((x) => x.code === code);
  check('list shows used + resumes', !!one?.usedAt && one.resumes === 1 && !('seatHash' in one), one);

  const state = readFileSync(join(dir, 'state.json'), 'utf8');
  check('state has no raw seat or token', !state.includes(seat) && !state.includes(admin));

  const cors = await call('POST', '/invites/redeem', { code: 'nope123456' }, null, { Origin: 'https://3104212-design.github.io' });
  check('CORS for pages origin', cors.headers.get('access-control-allow-origin') === 'https://3104212-design.github.io');
  const cors2 = await call('POST', '/invites/redeem', { code: 'nope123456' }, null, { Origin: 'https://evil.example' });
  check('no CORS for other origin', !cors2.headers.get('access-control-allow-origin'));
  const big = await fetch(base + '/invites/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'x'.repeat(6000) }) }).catch(() => ({ status: 'reset' }));
  check('oversized body rejected', big.status === 400 || big.status === 'reset', big.status);
  let limitedHit = false;
  for (let i = 0; i < 40; i++) if ((await call('POST', '/invites/redeem', { code: 'zzzzzzzzzz' })).status === 429) limitedHit = true;
  check('rate limit kicks in', limitedHit);
} finally {
  proc.kill();
}
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
