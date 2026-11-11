// מריץ את בדיקת התצוגה על כל המסכים, בשני מצבי התצוגה, ברוחב הנוכחי.
//   const m = await import('/scripts/qa-run.js'); m.seed(); location.reload();  (נתוני בדיקה)
//   const m = await import('/scripts/qa-run.js'); await m.runAll()
// לבדיקה בלבד, בכתובת נפרדת: כותב נתוני דמו לאחסון המקומי.
import { audit } from './qa-audit.js';

const KEY = 'latzod.v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function photo() {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 120;
  const g = c.getContext('2d');
  g.fillStyle = '#7cb7e8';
  g.fillRect(0, 0, 160, 120);
  g.fillStyle = '#f6d36b';
  g.beginPath();
  g.arc(120, 30, 18, 0, 7);
  g.fill();
  return c.toDataURL('image/jpeg', 0.7);
}

export function seed({ onboarded = true } = {}) {
  const now = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const back = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };
  const days = {};
  for (let i = 0; i < 12; i++) {
    const d = iso(back(i));
    days[d] = {
      checkin: back(i).toISOString(),
      done: i % 3 !== 0,
      answers: i % 2 ? ['ענייתי בכנות על השאלה הזו, והרגשתי הקלה גדולה אחרי השיחה עם הספונסר.', '', 'עוד תשובה'] : [],
      note: i === 4 ? 'יום קשה בעבודה, אבל עברתי אותו.' : undefined,
      review: i > 0 ? { clean: i !== 6, mood: (i % 5) + 1, craving: i % 10, triggers: i % 2 ? ['לחץ', 'עייפות'] : ['בדידות'], at: back(i).toISOString() } : undefined,
    };
  }
  const st = {
    version: 1,
    onboarded,
    seenVersion: '2.0.0',
    joinedAt: iso(back(40)),
    mode: 'calendar',
    editorMode: false,
    sponsorName: 'יוסי הספונסר',
    sponsorPhone: '050-1234567',
    trackers: [
      { id: 'a', name: 'אלכוהול', since: iso(back(95)) + 'T08:30', costPerDay: 85, hoursPerDay: 3, history: [{ start: iso(back(200)) + 'T09:00', end: iso(back(95)) + 'T08:30', note: 'למדתי שלחץ בעבודה הוא טריגר', triggers: ['לחץ'] }] },
      { id: 'b', name: 'הימורים מקוונים באפליקציות', since: iso(back(3)) + 'T22:15', costPerDay: 1200, hoursPerDay: 5, history: [] },
    ],
    reasons: [
      { id: 'r1', text: 'כדי להיות שם בשביל הילדים שלי, בכל ערב', photo: photo() },
      { id: 'r2', text: 'בריאות' },
    ],
    cravings: [
      { at: back(1).toISOString(), intensity: 7, triggers: ['לחץ'] },
      { at: back(2).toISOString(), intensity: 4, triggers: ['בדידות', 'שעמום'] },
    ],
    days,
    content: {},
  };
  localStorage.setItem(KEY, JSON.stringify(st));
}

const ROUTES = [
  { hash: '#/' },
  { hash: '#/day/PAST', past: 5 },
  { hash: '#/day/FUTURE', past: -3 },
  { hash: '#/clean' },
  { hash: '#/path' },
  { hash: '#/path', open: 'details.bookmark' },
  { hash: '#/step/4' },
  { hash: '#/journal' },
  { hash: '#/more' },
  { hash: '#/', click: '.sos-btn' },
  { hash: '#/clean', clickText: 'עריכה' },
  { hash: '#/clean', clickText: 'מעדתי' },
  { hash: '#/clean', click: '.stats > button:nth-child(1)' },
  { hash: '#/clean', click: '.stats > button:nth-child(2)' },
  { hash: '#/more', clickText: 'הגדרת קוד' },
  { hash: '#/more', clickText: 'קוד QR' },
  { hash: '#/journal', search: 'בכנות' },
  { hash: '#/journal', click: '.week-open' },
  { hash: '#/', click: '.walk-cta' },
  { hash: '#/', walk: 2 },
  { hash: '#/', walk: 4 },
  { hash: '#/', walk: 4, then: '.walk-actions .btn-ghost' },
  { hash: '#/', celebrate: true },
];

function dayHash(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function closeSheets() {
  document.querySelector('.celebrate-big')?.click();
  document.querySelector('.walk .icon-btn')?.click();
  for (let i = 0; i < 3 && document.querySelector('.sheet-backdrop'); i++) {
    document.querySelector('.close-btn')?.click();
    await sleep(150);
  }
}

export async function runAll({ size } = {}) {
  const out = {};
  if (size) document.documentElement.dataset.size = size;
  else delete document.documentElement.dataset.size;
  for (const theme of ['light', 'dark']) {
    document.documentElement.dataset.theme = theme;
    for (const r of ROUTES) {
      await closeSheets();
      const hash = r.hash.replace('PAST', dayHash(r.past ?? 0)).replace('FUTURE', dayHash(r.past ?? 0));
      if (location.hash !== hash) {
        location.hash = hash;
        await sleep(350);
      }
      window.scrollTo(0, 0);
      if (r.open) document.querySelector(r.open)?.setAttribute('open', '');
      if (r.click) document.querySelector(r.click)?.click();
      if (r.walk != null) {
        document.querySelector('.walk-cta')?.click();
        await sleep(150);
        document.querySelectorAll('.walk-foot')[r.walk]?.click();
        if (r.then) {
          await sleep(150);
          document.querySelector(r.then)?.click();
        }
      }
      if (r.clickText) [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === r.clickText)?.click();
      if (r.search) {
        const inp = document.querySelector('.search input');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, r.search);
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (r.celebrate) (await import('/src/lib/feedback.ts')).celebrate({ size: 'big', title: 'שבוע נקי מהימורים מקוונים!', text: 'צעד אחר צעד.', share: () => {} });
      await sleep(250);
      const label = `${theme} ${r.hash}${r.open ? ' ' + r.open : ''}${r.click ? ' ' + r.click : ''}${r.clickText ? ' ' + r.clickText : ''}${r.search ? ' search' : ''}${r.celebrate ? ' celebrate' : ''}${r.walk != null ? ' walk' + r.walk + (r.then ? ' end' : '') : ''}`;
      const found = audit();
      if (found.length) out[label] = found;
    }
  }
  await closeSheets();
  delete document.documentElement.dataset.theme;
  return out;
}
