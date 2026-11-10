// הלוגיקה של המסלול: איזה צעד ואיזה יום בצעד שייכים לכל תאריך.

import { HEBREW_MONTHS, getStep, type Step } from '../content/steps';
import bundledJson from '../content/days.json';
import { addDays, daysInMonth, diffDays, fromISO, type ISODate } from './dates';

export type Mode = 'calendar' | 'personal';

export interface TrackSettings {
  mode: Mode;
  startDate?: ISODate;
  /** יום ההצטרפות. במסלול לפי לוח השנה, הסבב השנתי מתחיל בחודש הזה */
  anchor?: ISODate;
}

/** תוכן של יום אחד. מפתח: "<צעד>-<יום>", למשל "1-1" */
export interface DayContent {
  title?: string;
  reading?: string;
  questions?: string[];
  prayer?: string;
  page?: number;
}

export interface Position {
  date: ISODate;
  step: number;
  day: number;
  length: number;
  key: string;
}

/** אורכי החודשים בספר (שנה מעוברת, 366 ימים) */
const CYCLE_LENGTHS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const CYCLE_TOTAL = CYCLE_LENGTHS.reduce((a, b) => a + b, 0);
const CYCLE_OFFSETS = CYCLE_LENGTHS.map((_, i) => CYCLE_LENGTHS.slice(0, i).reduce((a, b) => a + b, 0));

/** מספר הקריאות בספר לכל צעד (בפברואר יש 28 קריאות) */
const BOOK_READINGS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** תוכן הספר (כשיתקבל). גובר על הטיוטות */
const BUNDLED = bundledJson as Record<string, DayContent>;
/** טקסטים מקוריים זמניים שנכתבו לאפליקציה, עד לקבלת תוכן הספר. קובץ לכל חודש בתיקייה drafts */
const draftFiles = import.meta.glob<Record<string, DayContent>>('../content/drafts/*.json', {
  eager: true,
  import: 'default',
});
const DRAFTS: Record<string, DayContent> = Object.assign({}, ...Object.values(draftFiles));

const isPersonal = (s: TrackSettings) => s.mode === 'personal' && !!s.startDate;

/** המיקום במסלול עבור תאריך. במסלול אישי, לפני תאריך ההתחלה מחזיר null */
export function positionFor(date: ISODate, s: TrackSettings): Position | null {
  if (isPersonal(s)) {
    const n = diffDays(s.startDate!, date);
    if (n < 0) return null;
    let r = n % CYCLE_TOTAL;
    for (let i = 0; i < 12; i++) {
      if (r < CYCLE_LENGTHS[i]) {
        return { date, step: i + 1, day: r + 1, length: CYCLE_LENGTHS[i], key: `${i + 1}-${r + 1}` };
      }
      r -= CYCLE_LENGTHS[i];
    }
  }
  const d = fromISO(date);
  const step = d.getMonth() + 1;
  const day = d.getDate();
  return { date, step, day, length: daysInMonth(d.getFullYear(), step), key: `${step}-${day}` };
}

/**
 * כל התאריכים ששייכים לצעד, בתוך הסבב השנתי שכולל את תאריך הייחוס.
 * במסלול לפי לוח השנה הסבב מתחיל בחודש ההצטרפות: מי שהצטרף בנובמבר יעבור את ינואר-אוקטובר בשנה הבאה.
 */
export function stepDates(step: number, ref: ISODate, s: TrackSettings): ISODate[] {
  if (isPersonal(s)) {
    const n = Math.max(0, diffDays(s.startDate!, ref));
    const cycle = Math.floor(n / CYCLE_TOTAL);
    const begin = addDays(s.startDate!, cycle * CYCLE_TOTAL + CYCLE_OFFSETS[step - 1]);
    return Array.from({ length: CYCLE_LENGTHS[step - 1] }, (_, i) => addDays(begin, i));
  }
  const r = fromISO(ref);
  let year = r.getFullYear();
  if (r.getMonth() + 1 !== step && s.anchor) {
    const a = fromISO(s.anchor);
    const aMonth = a.getMonth() + 1;
    const monthsSince = Math.max(0, (year - a.getFullYear()) * 12 + (r.getMonth() + 1 - aMonth));
    const cycleYear = a.getFullYear() + Math.floor(monthsSince / 12);
    year = step >= aMonth ? cycleYear : cycleYear + 1;
  }
  const len = daysInMonth(year, step);
  const mm = String(step).padStart(2, '0');
  return Array.from({ length: len }, (_, i) => `${year}-${mm}-${String(i + 1).padStart(2, '0')}`);
}

export interface ResolvedDay {
  step: Step;
  title?: string;
  reading?: string;
  questions: string[];
  prayer: string;
  page?: number;
  /** התאריך שבראש הדף בספר, למשל "17 באפריל" */
  bookDate?: string;
  /** האם יש ליום הזה תוכן ייעודי (כותרת או קריאה) */
  hasReading: boolean;
  /** התוכן של היום הוא טיוטה מקורית זמנית ולא תוכן הספר */
  isDraft: boolean;
}

function fallbackQuestions(step: Step, day: number): string[] {
  const pool = step.questions;
  const start = ((day - 1) * 2) % pool.length;
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
}

/** תוכן הספר והתוכן שהוזן במצב עריכה (בלי הטיוטות) */
export function getContent(key: string, overrides: Record<string, DayContent>): DayContent {
  return { ...BUNDLED[key], ...overrides[key] };
}

export function resolveDay(pos: Position, overrides: Record<string, DayContent>): ResolvedDay {
  const step = getStep(pos.step);
  // סדר העדיפויות ליום: תוכן הספר או תוכן שהוזן במכשיר, ורק אם אין כזה, טיוטה מקורית
  const hasOwn = !!(BUNDLED[pos.key] || overrides[pos.key]);
  const draft = hasOwn ? undefined : DRAFTS[pos.key];
  const c = draft ?? getContent(pos.key, overrides);
  const qs = (c.questions ?? []).map((q) => q.trim()).filter(Boolean);
  const inBook = pos.day <= BOOK_READINGS[pos.step - 1];
  const page = c.page ?? (inBook ? step.bookFirstPage + pos.day - 1 : undefined);
  return {
    step,
    title: c.title?.trim() || undefined,
    reading: c.reading?.trim() || undefined,
    questions: qs.length ? qs : fallbackQuestions(step, pos.day),
    prayer: c.prayer?.trim() || step.prayer,
    page,
    bookDate: inBook ? `${pos.day} ב${HEBREW_MONTHS[pos.step - 1]}` : undefined,
    hasReading: !!(c.title?.trim() || c.reading?.trim()),
    isDraft: !!draft,
  };
}
