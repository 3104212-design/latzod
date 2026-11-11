// מצב האפליקציה. הכל נשמר רק על המכשיר (localStorage), בלי שרת ובלי חשבון.

import { useSyncExternalStore } from 'react';
import { todayISO, type ISODate } from './dates';
import type { DayContent, Mode, TrackSettings } from './program';
import { nowInputValue } from './dates';
import { elapsedMs, reachedMilestone, uid, type Tracker } from './sobriety';
import type { LockConfig } from './lock';

export interface DayRecord {
  /** מתי נרשמה ההתחייבות "רק להיום" */
  checkin?: string;
  /** העבודה של היום הושלמה */
  done?: boolean;
  answers?: string[];
  /** נוסח השאלות שעליהן ענו באותו יום */
  questions?: string[];
  note?: string;
  /** סיכום הערב */
  review?: DayReview;
  /** הקריאה היומית נקראה */
  read?: boolean;
  /** התפילה היומית נאמרה */
  prayed?: boolean;
}

export interface DayReview {
  /** היום עבר נקי */
  clean: boolean;
  /** מצב רוח 1 עד 5 */
  mood?: number;
  /** עוצמת הדחף 0 עד 10 */
  craving?: number;
  triggers: string[];
  at: string;
}

/** רישום של דחף, מהחלון "עזרה עכשיו" */
export interface CravingLog {
  at: string;
  intensity: number;
  triggers: string[];
  note?: string;
}

/** סיבה אישית לדרך, עם תמונה אופציונלית */
export interface Reason {
  id: string;
  text: string;
  /** תמונה מוקטנת כ-data URL */
  photo?: string;
}

export interface AppState {
  version: 1;
  onboarded: boolean;
  /** יום ההצטרפות (YYYY-MM-DD) */
  joinedAt?: ISODate;
  mode: Mode;
  startDate?: ISODate;
  /** ספירות ימים נקיים, אחת לכל התמכרות */
  trackers: Tracker[];
  reasons: Reason[];
  cravings: CravingLog[];
  /** שדה ישן (ספירה אחת). מומר ל-trackers בטעינה */
  cleanSince?: string;
  sponsorName?: string;
  sponsorPhone?: string;
  editorMode: boolean;
  theme?: 'auto' | 'light' | 'dark';
  /** גודל הטקסט באפליקציה */
  textSize?: 'normal' | 'large' | 'xlarge';
  /** נעילה בקוד (גיבוב בלבד) */
  lock?: LockConfig;
  /** שעות התזכורות שנבחרו, HH:mm */
  reminders?: { morning: string; evening: string };
  /** אבן הדרך האחרונה שנחגגה, לכל ספירה (בימים) */
  celebrated?: Record<string, number>;
  /** הגרסה האחרונה שה"מה חדש" שלה הוצג */
  seenVersion?: string;
  /** המשתמש סגר את ההצעה להתקין את האפליקציה */
  installDismissed?: boolean;
  days: Record<ISODate, DayRecord>;
  /** תוכן יומי שהוזן במצב עריכה. מפתח: "<צעד>-<יום>" */
  content: Record<string, DayContent>;
}

const KEY = 'latzod.v1';

export const DEFAULT_STATE: AppState = {
  version: 1,
  onboarded: false,
  mode: 'calendar',
  editorMode: false,
  trackers: [],
  reasons: [],
  cravings: [],
  days: {},
  content: {},
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export function normalize(input: unknown): AppState {
  const o = (input && typeof input === 'object' ? input : {}) as Partial<AppState>;
  const days = o.days && typeof o.days === 'object' ? o.days : {};
  const firstDay = Object.keys(days).sort()[0];
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  let trackers = arr<Tracker>(o.trackers).map((t) => ({ ...t, history: arr<Tracker['history'][number]>(t.history) }));
  // מעבר מהגרסה הקודמת: ספירה אחת בשדה cleanSince
  if (!trackers.length && o.cleanSince) {
    trackers = [{ id: 'main', name: 'ההתמכרות שלי', since: o.cleanSince, history: [] }];
  }
  const celebrated: Record<string, number> = { ...(o.celebrated ?? {}) };
  for (const t of trackers) if (celebrated[t.id] == null) celebrated[t.id] = reachedMilestone(elapsedMs(t.since));
  return {
    ...DEFAULT_STATE,
    ...o,
    celebrated,
    version: 1,
    joinedAt: o.joinedAt ?? (o.onboarded ? (firstDay ?? todayISO()) : undefined),
    mode: o.mode === 'personal' ? 'personal' : 'calendar',
    days,
    trackers,
    reasons: arr<Reason>(o.reasons),
    cravings: arr<CravingLog>(o.cravings),
    cleanSince: undefined,
    content: o.content && typeof o.content === 'object' ? o.content : {},
  };
}

let state: AppState = load();
const listeners = new Set<() => void>();

/** שומר במכשיר. מחזיר false אם השמירה נכשלה (למשל כשהאחסון מלא) */
function persist(): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // אחסון חסום או מלא: האפליקציה ממשיכה לעבוד בזיכרון
    return false;
  }
}

/** הגדרות המסלול מתוך המצב */
export function trackOf(s: AppState): TrackSettings {
  return { mode: s.mode, startDate: s.startDate, anchor: s.joinedAt };
}

export function getState(): AppState {
  return state;
}

export function setState(next: AppState | ((s: AppState) => AppState)): boolean {
  state = typeof next === 'function' ? next(state) : next;
  const ok = persist();
  listeners.forEach((l) => l());
  return ok;
}

// ---------- ספירות ימים נקיים ----------

export function saveTracker(t: Omit<Tracker, 'id' | 'history'> & Partial<Pick<Tracker, 'id' | 'history'>>): string {
  const id = t.id ?? uid();
  setState((s) => {
    const exists = s.trackers.some((x) => x.id === id);
    const tracker: Tracker = { history: [], ...t, id };
    const before = s.trackers.find((x) => x.id === id);
    const celebrated = { ...s.celebrated };
    if (!before || before.since !== tracker.since) celebrated[id] = reachedMilestone(elapsedMs(tracker.since));
    return {
      ...s,
      celebrated,
      trackers: exists ? s.trackers.map((x) => (x.id === id ? { ...x, ...tracker } : x)) : [...s.trackers, tracker],
    };
  });
  return id;
}

export function removeTracker(id: string) {
  setState((s) => ({ ...s, trackers: s.trackers.filter((t) => t.id !== id) }));
}

/** מעידה: הרצף הנוכחי נשמר בהיסטוריה, וספירה חדשה מתחילה מעכשיו */
export function restartTracker(id: string, note?: string, triggers: string[] = []) {
  const now = nowInputValue();
  setState((s) => ({
    ...s,
    celebrated: { ...s.celebrated, [id]: 0 },
    trackers: s.trackers.map((t) =>
      t.id === id
        ? { ...t, since: now, history: [...t.history, { start: t.since, end: now, note: note?.trim() || undefined, triggers }] }
        : t,
    ),
  }));
}

// ---------- סיבות ודחפים ----------

export function addReason(text: string, photo?: string): boolean {
  return setState((s) => ({ ...s, reasons: [...s.reasons, { id: uid(), text: text.trim(), photo }] }));
}

export function removeReason(id: string) {
  setState((s) => ({ ...s, reasons: s.reasons.filter((r) => r.id !== id) }));
}

export function logCraving(c: Omit<CravingLog, 'at'>) {
  setState((s) => ({ ...s, cravings: [...s.cravings, { ...c, at: new Date().toISOString() }] }));
}

export function updateDay(date: ISODate, patch: (d: DayRecord) => DayRecord) {
  setState((s) => ({ ...s, days: { ...s.days, [date]: patch(s.days[date] ?? {}) } }));
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  setState(DEFAULT_STATE);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** מוריד קובץ JSON למכשיר */
export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** קורא קובץ JSON שהמשתמש בחר */
export function readJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        resolve(JSON.parse(String(r.result)));
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
