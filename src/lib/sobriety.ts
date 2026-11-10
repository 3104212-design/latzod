// ספירת ימים נקיים: אבני דרך, חיסכון בכסף ובזמן, רצפים.

export interface StreakRecord {
  /** תחילת הרצף, YYYY-MM-DDTHH:mm */
  start: string;
  /** סוף הרצף (רגע המעידה) */
  end: string;
  note?: string;
  triggers?: string[];
}

export interface Tracker {
  id: string;
  /** ממה מתנקים, למשל "אלכוהול" */
  name: string;
  /** תחילת הרצף הנוכחי, YYYY-MM-DDTHH:mm */
  since: string;
  /** כמה כסף (₪) הלך על ההתמכרות ביום */
  costPerDay?: number;
  /** כמה שעות ביום הלכו על ההתמכרות */
  hoursPerDay?: number;
  /** רצפים קודמים */
  history: StreakRecord[];
}

export const DAY_MS = 86400000;

export const MILESTONES: { days: number; label: string }[] = [
  { days: 1, label: '24 שעות' },
  { days: 2, label: 'יומיים' },
  { days: 3, label: '3 ימים' },
  { days: 5, label: '5 ימים' },
  { days: 7, label: 'שבוע' },
  { days: 10, label: '10 ימים' },
  { days: 14, label: 'שבועיים' },
  { days: 21, label: '3 שבועות' },
  { days: 30, label: 'חודש' },
  { days: 45, label: '45 יום' },
  { days: 60, label: 'חודשיים' },
  { days: 90, label: '3 חודשים' },
  { days: 120, label: '4 חודשים' },
  { days: 150, label: '5 חודשים' },
  { days: 180, label: 'חצי שנה' },
  { days: 270, label: '9 חודשים' },
  { days: 365, label: 'שנה' },
  { days: 500, label: '500 יום' },
  { days: 730, label: 'שנתיים' },
  { days: 1000, label: '1,000 יום' },
  { days: 1095, label: '3 שנים' },
  { days: 1460, label: '4 שנים' },
  { days: 1825, label: '5 שנים' },
  { days: 3650, label: '10 שנים' },
];

/** תגיות מוכנות לטריגרים */
export const TRIGGERS = [
  'לחץ',
  'בדידות',
  'כעס',
  'עייפות',
  'רעב',
  'שעמום',
  'עצב',
  'חגיגה',
  'ריב',
  'כסף',
  'אנשים מסוימים',
  'מקום מסוים',
  'סוף שבוע',
  'אחר',
];

export const MOODS = [
  { value: 1, emoji: '😞', label: 'קשה מאוד' },
  { value: 2, emoji: '😕', label: 'קשה' },
  { value: 3, emoji: '😐', label: 'בסדר' },
  { value: 4, emoji: '🙂', label: 'טוב' },
  { value: 5, emoji: '😄', label: 'טוב מאוד' },
];

export function parseLocal(s: string): number {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

export function elapsedMs(since: string, now = Date.now()): number {
  return Math.max(0, now - parseLocal(since));
}

export function breakdown(ms: number) {
  return {
    days: Math.floor(ms / DAY_MS),
    hours: Math.floor((ms % DAY_MS) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}

export function moneySaved(t: Tracker, ms: number): number {
  return ((t.costPerDay ?? 0) * ms) / DAY_MS;
}

export function hoursSaved(t: Tracker, ms: number): number {
  return ((t.hoursPerDay ?? 0) * ms) / DAY_MS;
}

/** אבן הדרך הבאה וההתקדמות אליה (0 עד 1) */
export function nextMilestone(ms: number) {
  const days = ms / DAY_MS;
  const idx = MILESTONES.findIndex((m) => m.days > days);
  if (idx === -1) return null;
  const next = MILESTONES[idx];
  const prevDays = idx > 0 ? MILESTONES[idx - 1].days : 0;
  return {
    ...next,
    progress: (days - prevDays) / (next.days - prevDays),
    remainingMs: next.days * DAY_MS - ms,
  };
}

/** הרצף הארוך ביותר, כולל הנוכחי */
export function longestMs(t: Tracker, now = Date.now()): number {
  const past = t.history.map((h) => Math.max(0, parseLocal(h.end) - parseLocal(h.start)));
  return Math.max(elapsedMs(t.since, now), ...past, 0);
}

export function daysLabel(n: number): string {
  if (n === 1) return 'יום אחד';
  if (n === 2) return 'יומיים';
  return `${n.toLocaleString('he-IL')} ימים`;
}

export function durationLabel(ms: number): string {
  const { days, hours } = breakdown(ms);
  if (days === 0) {
    if (hours === 0) return 'פחות משעה';
    return hours === 1 ? 'שעה אחת' : hours === 2 ? 'שעתיים' : `${hours} שעות`;
  }
  if (hours === 0) return daysLabel(days);
  return `${daysLabel(days)} ו-${hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : `${hours} שעות`}`;
}

const money = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
export function formatMoney(n: number): string {
  return money.format(Math.floor(n));
}

export function formatHours(h: number): string {
  if (h < 48) return `${Math.floor(h).toLocaleString('he-IL')} שעות`;
  return `${Math.floor(h / 24).toLocaleString('he-IL')} ימים`;
}

/** האם צריך אזהרה רפואית על הפסקה פתאומית (אלכוהול, כדורי הרגעה) */
export function needsMedicalNote(name: string): boolean {
  return /אלכוהול|שתייה|כדורי|כדורים|הרגעה|בנזו|קלונקס|וואבן|ואבן|אסיבל|לוריוואן/.test(name);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
