// עבודת היום: חמשת הצעדים, מה כבר נעשה, ומתי היום נחשב "הושלם".
// משותף למסך היום ולצעידה המודרכת, כדי ששניהם יעבדו בדיוק אותו דבר.

import { celebrate } from './feedback';
import type { ISODate } from './dates';
import { updateDay, type DayRecord } from './store';

/** cat: צבע המשנה של הצעד (מחלקות .cat-* ב-styles-v24.css), בכרטיס, בכותרת ובעקבה */
export const FLOW = [
  { id: 'sec-pledge', cat: 'pledge', label: 'התחייבות', short: 'התחייבות' },
  { id: 'sec-read', cat: 'read', label: 'קריאה', short: 'קריאה' },
  { id: 'sec-questions', cat: 'questions', label: 'שאלון', short: 'שאלון' },
  { id: 'sec-prayer', cat: 'prayer', label: 'תפילה', short: 'תפילה' },
  { id: 'sec-review', cat: 'review', label: 'סיכום ערב', short: 'סיכום' },
] as const;

/** לכל אחד מחמשת הצעדים: האם נעשה */
export function flowState(rec: DayRecord): boolean[] {
  const wrote = (rec.answers ?? []).some((a) => a?.trim()) || !!rec.note?.trim();
  return [!!rec.checkin, !!rec.read, wrote, !!rec.prayed, !!rec.review];
}

/** הצעד הבא שעוד לא נעשה (5 = הכל נעשה) */
export function nextFlowIndex(rec: DayRecord): number {
  const i = flowState(rec).findIndex((x) => !x);
  return i < 0 ? FLOW.length : i;
}

/** ערב: הזמן של סיכום היום */
export const isEvening = (h = new Date().getHours()) => h >= 17 || h < 4;

/**
 * עדכון יום. "הושלם" נקבע לפי חמשת הצעדים: כשכולם נעשו היום מסומן כהושלם (וחוגגים),
 * וכשמבטלים צעד, הסימון יורד. ימים שסומנו ידנית בגרסאות קודמות נשארים כמו שהם.
 * מחזיר true אם העדכון הזה השלים את היום.
 */
export function updateWithFlow(date: ISODate, patch: (d: DayRecord) => DayRecord, celebrateDone = true): boolean {
  let completed = false;
  updateDay(date, (d) => {
    const next = patch(d);
    const all = flowState(next).every(Boolean);
    if (all && !d.done) {
      completed = true;
      return { ...next, done: true, doneBy: 'flow' };
    }
    if (!all && d.done && d.doneBy === 'flow') return { ...next, done: false, doneBy: undefined };
    return next;
  });
  if (completed && celebrateDone) {
    celebrate({ size: 'big', title: 'היום הושלם!', text: 'התחייבות, קריאה, שאלון, תפילה וסיכום. צעד שלם בדרך. רק להיום.' });
  }
  return completed;
}

/** ברכה לפי השעה, עם השם אם נשמר */
export function greeting(name?: string, h = new Date().getHours()) {
  const g = h >= 5 && h < 12 ? 'בוקר טוב' : h >= 12 && h < 17 ? 'צהריים טובים' : h >= 17 && h < 22 ? 'ערב טוב' : 'לילה טוב';
  const n = name?.trim();
  return n ? `${g}, ${n}` : g;
}
