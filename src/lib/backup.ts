// שחזור מגיבוי: משותף למסך "עוד" ולמסך הכניסה (מי שעובר לטלפון חדש נכנס עם הגיבוי שלו).

import { daysLabel } from './sobriety';
import { getState, normalize, readJSONFile, setState, type AppState } from './store';

/** קובץ שנראה כמו גיבוי של האפליקציה (ולא קובץ תוכן או JSON אחר) */
export function isBackup(raw: unknown): raw is Partial<AppState> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return (o.days != null && typeof o.days === 'object') || Array.isArray(o.trackers) || typeof o.onboarded === 'boolean';
}

export type RestoreResult = 'restored' | 'cancelled' | 'not-backup' | 'unreadable';

/** קורא קובץ, מוודא שזה גיבוי, מפרט מה יש בו, ורק באישור מחליף את כל הנתונים */
export async function restoreBackupFile(f: File): Promise<RestoreResult> {
  let raw: unknown;
  try {
    raw = await readJSONFile(f);
  } catch {
    return 'unreadable';
  }
  // קובץ אחר (למשל קובץ התוכן) היה מוחק את כל הנתונים. מקבלים רק גיבוי של האפליקציה
  if (!isBackup(raw)) return 'not-backup';
  const data = normalize(raw);
  const days = Object.keys(data.days).length;
  const counters = data.trackers.length;
  const what = `בגיבוי: ${daysLabel(days)} ביומן${counters ? `, ${counters === 1 ? 'ספירה אחת' : `${counters} ספירות`}` : ''}.`;
  if (!confirm(`${what}\n\nהגיבוי יחליף את כל הנתונים שבמכשיר עכשיו. להמשיך?`)) return 'cancelled';
  applyRestore(data);
  return 'restored';
}

/** מחליף את הנתונים בנתונים מהגיבוי, ומשאיר את מה ששייך למכשיר: מצב המנהל וההזמנה.
 *  בלי זה, גיבוי ישן (או מטלפון אחר) היה מוחק את ניהול ההזמנות בטלפון של הבעלים */
export function applyRestore(data: AppState) {
  const cur = getState();
  setState({ ...data, onboarded: true, admin: cur.admin ?? data.admin, access: cur.access ?? data.access });
}

/** מה שנכנס לקובץ הגיבוי: כל הנתונים, בלי מפתח המנהל (מי שמקבל את הקובץ לא יוכל לנהל איתו הזמנות) */
export function backupData(s: AppState): Omit<AppState, 'admin'> {
  const { admin: _admin, ...rest } = s;
  return rest;
}

export const RESTORE_MESSAGES: Record<Exclude<RestoreResult, 'cancelled'>, string> = {
  restored: 'הגיבוי שוחזר',
  'not-backup': 'הקובץ הזה אינו גיבוי של האפליקציה',
  unreadable: 'לא הצלחנו לקרוא את הקובץ',
};
