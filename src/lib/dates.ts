// עזרי תאריכים. כל התאריכים נשמרים כמחרוזת מקומית YYYY-MM-DD.

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** מספר הימים מ-a עד b (b פחות a), לפי ימים קלנדריים מקומיים */
export function diffDays(a: ISODate, b: ISODate): number {
  const da = fromISO(a);
  const db = fromISO(b);
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

const gregFmt = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortFmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' });

let hebFmt: Intl.DateTimeFormat | null = null;
try {
  hebFmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
} catch {
  hebFmt = null;
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/** מספר באותיות עבריות, עם גרש או גרשיים: 15 → ט״ו, 787 → תשפ״ז */
export function gematria(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let s = HUNDREDS[h];
  if (t === 1 && (o === 5 || o === 6)) s += o === 5 ? 'טו' : 'טז';
  else s += TENS[t] + ONES[o];
  if (s.length === 1) return s + '׳';
  return s.slice(0, -1) + '״' + s.slice(-1);
}

/** הרגע הנוכחי בפורמט של שדה datetime-local: YYYY-MM-DDTHH:mm */
export function nowInputValue(d = new Date()): string {
  return `${toISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatLong(s: ISODate): string {
  return gregFmt.format(fromISO(s));
}

export function formatShort(s: ISODate): string {
  return shortFmt.format(fromISO(s));
}

export function formatHebrew(s: ISODate): string {
  if (!hebFmt) return '';
  try {
    const parts = hebFmt.formatToParts(fromISO(s));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const day = parseInt(get('day'), 10);
    const year = parseInt(get('year'), 10);
    const month = get('month');
    if (!day || !year || !month) return hebFmt.format(fromISO(s));
    return `${gematria(day)} ב${month} ה${gematria(year % 1000)}`;
  } catch {
    return '';
  }
}
