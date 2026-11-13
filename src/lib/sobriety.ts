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

/** major: אבן דרך מרכזית (כוכב על המדליה) */
export const MILESTONES: { days: number; label: string; major?: boolean }[] = [
  { days: 1, label: '24 שעות', major: true },
  { days: 2, label: 'יומיים' },
  { days: 3, label: '3 ימים' },
  { days: 5, label: '5 ימים' },
  { days: 7, label: 'שבוע', major: true },
  { days: 10, label: '10 ימים' },
  { days: 14, label: 'שבועיים' },
  { days: 21, label: '3 שבועות' },
  { days: 30, label: 'חודש', major: true },
  { days: 45, label: '45 יום' },
  { days: 60, label: 'חודשיים' },
  { days: 90, label: '3 חודשים', major: true },
  { days: 120, label: '4 חודשים' },
  { days: 150, label: '5 חודשים' },
  { days: 180, label: 'חצי שנה', major: true },
  { days: 270, label: '9 חודשים' },
  { days: 365, label: 'שנה', major: true },
  { days: 500, label: '500 יום' },
  { days: 730, label: 'שנתיים' },
  { days: 1000, label: '1,000 יום' },
  { days: 1095, label: '3 שנים' },
  { days: 1460, label: '4 שנים' },
  { days: 1825, label: '5 שנים', major: true },
  { days: 3650, label: '10 שנים', major: true },
];

/**
 * רמות של אבני הדרך, לפי חשיבות: כל רמה עם שם, צבע (lvl-N ב-styles-v25.css) וצורת מדליה משלה.
 * upTo: אבן הדרך האחרונה ברמה (בימים).
 */
export const MILESTONE_LEVELS = [
  { level: 1, name: 'הצעדים הראשונים', upTo: 10 },
  { level: 2, name: 'מתחזקים', upTo: 60 },
  { level: 3, name: 'דרך ארוכה', upTo: 270 },
  { level: 4, name: 'שנים של חופש', upTo: Infinity },
] as const;

export type MilestoneLevel = (typeof MILESTONE_LEVELS)[number];

/** הרמה של אבן דרך (לפי מספר הימים שלה) */
export function levelOf(days: number): MilestoneLevel {
  return MILESTONE_LEVELS.find((l) => days <= l.upTo) ?? MILESTONE_LEVELS[MILESTONE_LEVELS.length - 1];
}

/** אבני הדרך של כל רמה */
export function milestonesOf(level: number) {
  return MILESTONES.filter((m) => levelOf(m.days).level === level);
}

/** עם מי היה קשר אמיתי היום (סיכום הערב). "אף אחד" נשמר כרשימה ריקה */
export const CONNECTIONS = ['ספונסר', 'קבוצה או פגישה', 'משפחה', 'חברים', 'מישהו מהדרך', 'איש או אשת מקצוע'];

/** שאלת הקשר נשאלת במידה, לא בכל ערב: ראשון, שלישי וחמישי */
export function asksConnection(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  return [0, 2, 4].includes(new Date(y, m - 1, d).getDay());
}

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

/** המילה שליד מספר גדול של ימים: "1 יום נקי", "2 ימים נקיים" */
export function cleanDaysWord(n: number): string {
  return n === 1 ? 'יום נקי' : 'ימים נקיים';
}

/**
 * משך עם "נקי" בהתאמה דקדוקית: "שבוע נקי", "שנה נקייה", "24 שעות נקיות", "3 ימים נקיים".
 * (לפני כן נכתב תמיד "נקיים", גם "שבוע נקיים" ו"שנה נקיים")
 */
export function cleanPhrase(label: string): string {
  const words = label.trim().split(/\s+/);
  const last = words[words.length - 1];
  if (words.length === 1 && (last === 'שבוע' || last === 'חודש')) return `${label} נקי`;
  if (last === 'אחד') return `${label} נקי`;
  if (last === 'שנה' || last === 'אחת') return `${label} נקייה`;
  if (['שעות', 'שעתיים', 'שנים', 'שנתיים'].includes(last)) return `${label} נקיות`;
  return `${label} נקיים`;
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
  const whole = Math.floor(h);
  if (h < 48) return whole === 1 ? 'שעה אחת' : whole === 2 ? 'שעתיים' : `${whole.toLocaleString('he-IL')} שעות`;
  return daysLabel(Math.floor(h / 24));
}

/** האם צריך אזהרה רפואית על הפסקה פתאומית (אלכוהול, כדורי הרגעה) */
export function needsMedicalNote(name: string): boolean {
  return /אלכוהול|שתייה|כדורי|כדורים|הרגעה|בנזו|קלונקס|וואבן|ואבן|אסיבל|לוריוואן/.test(name);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** אבן הדרך הגבוהה ביותר שהושגה (במספר ימים), או 0 */
export function reachedMilestone(ms: number): number {
  const days = ms / DAY_MS;
  let best = 0;
  for (const m of MILESTONES) if (m.days <= days) best = m.days;
  return best;
}

export function milestoneLabel(days: number): string {
  return MILESTONES.find((m) => m.days === days)?.label ?? `${days} ימים`;
}
