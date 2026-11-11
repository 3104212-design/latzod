// שירות ההזמנות החד פעמיות של "לצעוד לתוך היום". בלי תלויות, Node בלבד.
//
// מה נשמר: קודי הזמנה, מתי נוצרו, נשלחו ונוצלו, הערה אופציונלית של המנהל (למי ההזמנה),
// וגיבובים (SHA-256) של מפתח המנהל ושל "מפתח המושב" של מי שנכנס. שום מידע מתוך האפליקציה.
//
// הרצה:   PORT=3741 STATE_DIR=/var/lib/latzod-invites node invites.mjs
// קוד ניהול חדש (למשל בטלפון חדש):   STATE_DIR=... node invites.mjs --new-setup-code
//
// API (הכל JSON):
//   POST   /api/invites/redeem  {code}          -> {seat}        כניסה ראשונה עם הזמנה. אחרי זה ההזמנה "נוצלה"
//   POST   /api/invites/resume  {code, seat}    -> {ok}          אותו אדם בהקשר נוסף (למשל אפליקציה במסך הבית באייפון)
//   POST   /api/admin/pair      {setup}         -> {token}       חיבור הטלפון של המנהל, עם קוד ניהול חד פעמי
//   GET    /api/invites                          -> {invites}     (מנהל)
//   POST   /api/invites         {note?}          -> {code}        (מנהל) הזמנה חדשה
//   PATCH  /api/invites/:code   {note?, given?}  -> {ok}          (מנהל) הערה, וסימון שההזמנה נשלחה
//   DELETE /api/invites/:code                     -> {ok}          (מנהל) ביטול הזמנה שעוד לא נוצלה
//   GET    /api/health                            -> {ok}

import { createServer } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.PORT || 3741);
const HOST = process.env.HOST || '127.0.0.1';
const DIR = process.env.STATE_DIR || './invites-state';
const FILE = join(DIR, 'state.json');
const SETUP_FILE = join(DIR, 'setup-code.txt');
/** האתר ב-GitHub Pages פונה לשירות מכתובת אחרת */
const ORIGINS = (process.env.ALLOW_ORIGINS || 'https://3104212-design.github.io').split(',').filter(Boolean);

// בלי אותיות ומספרים שמתבלבלים (0/o, 1/l/i)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const now = () => new Date().toISOString();
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
function token(len) {
  const bytes = randomBytes(len);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}
function sameHash(a, b) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------- מצב ----------
mkdirSync(DIR, { recursive: true });
let state = { setupHash: null, admins: [], invites: {} };
if (existsSync(FILE)) state = { ...state, ...JSON.parse(readFileSync(FILE, 'utf8')) };
function save() {
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 1), { mode: 0o600 });
  renameSync(tmp, FILE);
}
function newSetupCode() {
  const code = `${token(4)}-${token(4)}-${token(4)}`;
  state.setupHash = sha(code);
  save();
  writeFileSync(SETUP_FILE, `${code}\n`, { mode: 0o600 });
  return code;
}

if (process.argv.includes('--new-setup-code')) {
  console.log(`קוד ניהול חדש: ${newSetupCode()}`);
  process.exit(0);
}
// בפעם הראשונה (אין מנהל ואין קוד): יוצרים קוד ניהול ושומרים אותו בקובץ שרק root קורא
if (!state.admins.length && !state.setupHash) newSetupCode();

// ---------- הגבלת קצב לניסיונות (ניחוש קודים) ----------
const hits = new Map();
function limited(ip, max = 30, windowMs = 10 * 60 * 1000) {
  const t = Date.now();
  const list = (hits.get(ip) ?? []).filter((x) => t - x < windowMs);
  list.push(t);
  hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < windowMs)) hits.delete(k);
  return list.length > max;
}

// ---------- HTTP ----------
function send(res, status, body, origin) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (origin && ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 4096) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {});
      } catch {
        reject(new Error('bad json'));
      }
    });
    req.on('error', reject);
  });
}

const cleanCode = (c) => (typeof c === 'string' ? c.trim().toLowerCase() : '');
const cleanNote = (n) => (typeof n === 'string' ? n.trim().slice(0, 40) : undefined);

function isAdmin(req) {
  const m = /^Bearer\s+([a-z0-9]{20,80})$/.exec(req.headers.authorization ?? '');
  if (!m) return false;
  const h = sha(m[1]);
  return state.admins.some((a) => sameHash(a.hash, h));
}

const publicInvite = (code, x) => ({
  code,
  note: x.note,
  created: x.created,
  givenAt: x.givenAt,
  usedAt: x.usedAt,
  resumes: x.resumes ?? 0,
  revoked: !!x.revoked,
});

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url ?? '/', 'http://x');
  const path = url.pathname.replace(/\/+$/, '');
  const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();

  if (req.method === 'OPTIONS') {
    if (origin && ORIGINS.includes(origin)) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
      });
    } else res.writeHead(204);
    return res.end();
  }

  let body = {};
  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: 'bad-request' }, origin);
    }
  }

  try {
    if (path === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true }, origin);

    // ---- כניסה עם הזמנה ----
    if (path === '/api/invites/redeem' && req.method === 'POST') {
      if (limited(ip)) return send(res, 429, { error: 'slow-down' }, origin);
      const code = cleanCode(body.code);
      const inv = state.invites[code];
      if (!inv || inv.revoked) return send(res, 404, { error: 'invalid' }, origin);
      if (inv.usedAt) return send(res, 409, { error: 'used' }, origin);
      const seat = token(24);
      inv.usedAt = now();
      inv.seatHash = sha(seat);
      save();
      return send(res, 200, { seat }, origin);
    }

    if (path === '/api/invites/resume' && req.method === 'POST') {
      if (limited(ip)) return send(res, 429, { error: 'slow-down' }, origin);
      const code = cleanCode(body.code);
      const inv = state.invites[code];
      if (!inv || inv.revoked || !inv.seatHash) return send(res, 404, { error: 'invalid' }, origin);
      if (typeof body.seat !== 'string' || !sameHash(inv.seatHash, sha(body.seat.trim().toLowerCase())))
        return send(res, 409, { error: 'used' }, origin);
      inv.resumes = (inv.resumes ?? 0) + 1;
      save();
      return send(res, 200, { ok: true }, origin);
    }

    // ---- חיבור המנהל ----
    if (path === '/api/admin/pair' && req.method === 'POST') {
      if (limited(ip, 10)) return send(res, 429, { error: 'slow-down' }, origin);
      const setup = typeof body.setup === 'string' ? body.setup.trim().toLowerCase() : '';
      if (!state.setupHash || !setup || !sameHash(state.setupHash, sha(setup))) return send(res, 403, { error: 'bad-code' }, origin);
      const t = token(40);
      state.admins.push({ hash: sha(t), created: now() });
      state.setupHash = null; // הקוד חד פעמי
      save();
      rmSync(SETUP_FILE, { force: true });
      return send(res, 200, { token: t }, origin);
    }

    // ---- פעולות מנהל ----
    if (path.startsWith('/api/invites')) {
      if (!isAdmin(req)) return send(res, 401, { error: 'not-admin' }, origin);

      if (path === '/api/invites' && req.method === 'GET') {
        const list = Object.entries(state.invites)
          .map(([c, x]) => publicInvite(c, x))
          .sort((a, b) => (a.created < b.created ? 1 : -1));
        return send(res, 200, { invites: list }, origin);
      }

      if (path === '/api/invites' && req.method === 'POST') {
        let code;
        do code = token(10);
        while (state.invites[code]);
        state.invites[code] = { created: now(), note: cleanNote(body.note) };
        save();
        return send(res, 201, publicInvite(code, state.invites[code]), origin);
      }

      const m = /^\/api\/invites\/([a-z0-9]{6,20})$/.exec(path);
      const inv = m && state.invites[m[1]];
      if (m && !inv) return send(res, 404, { error: 'invalid' }, origin);

      if (m && req.method === 'PATCH') {
        if ('note' in body) inv.note = cleanNote(body.note);
        if (body.given === true && !inv.givenAt) inv.givenAt = now();
        save();
        return send(res, 200, publicInvite(m[1], inv), origin);
      }

      if (m && req.method === 'DELETE') {
        if (inv.usedAt) return send(res, 409, { error: 'used' }, origin);
        inv.revoked = true;
        save();
        return send(res, 200, publicInvite(m[1], inv), origin);
      }
    }

    return send(res, 404, { error: 'not-found' }, origin);
  } catch (e) {
    console.error(e);
    return send(res, 500, { error: 'server' }, origin);
  }
});

server.listen(PORT, HOST, () => console.log(`latzod-invites on ${HOST}:${PORT}, state in ${DIR}`));
