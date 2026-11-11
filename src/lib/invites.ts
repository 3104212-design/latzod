// הזמנות חד פעמיות: מול שירות קטן בשרת בענן (server/invites.mjs).
// כל הזמנה פותחת את האפליקציה פעם אחת, לאדם אחד. רק המנהל (בעל האפליקציה) יוצר הזמנות.
// השירות שומר רק קודי הזמנה. שום נתון מתוך האפליקציה לא נשלח אליו.

import { getState, setState } from './store';

const CLOUD = 'https://latzod.64-176-173-124.sslip.io';

/** הכתובת של הדף בלי ה-hash, ובלי // כפול בנתיב (כתובת כמו "…//#/" שלחה את הבקשות ל-//api, שהשרת לא מכיר) */
const pageBase = () => location.origin + location.pathname.replace(/\/{2,}/g, '/');

/** בענן ובפיתוח: אותה כתובת. ב-GitHub Pages: השירות שבענן */
export const API = location.hostname.endsWith('github.io') ? `${CLOUD}/api` : new URL('./api', pageBase()).href;

export type InviteError = 'used' | 'invalid' | 'network' | 'slow-down' | 'not-admin' | 'bad-code' | 'server';

export interface Invite {
  code: string;
  note?: string;
  created: string;
  givenAt?: string;
  usedAt?: string;
  resumes: number;
  revoked: boolean;
}

async function call<T>(method: string, path: string, body?: unknown, auth?: string): Promise<{ ok: true; data: T } | { ok: false; error: InviteError }> {
  try {
    const r = await fetch(`${API}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true, data: data as T };
    const e = (data as { error?: string }).error;
    if (r.status === 429) return { ok: false, error: 'slow-down' };
    return { ok: false, error: (['used', 'invalid', 'not-admin', 'bad-code'].includes(e ?? '') ? e : 'server') as InviteError };
  } catch {
    return { ok: false, error: 'network' };
  }
}

// ---------- קישורים ----------

/** הכתובת של האפליקציה עצמה (בענן או ב-GitHub Pages, לפי איפה שהיא פתוחה) */
export function appLink(): string {
  return new URL('./', pageBase()).href;
}

export const inviteLink = (code: string) => `${appLink()}#/join/${code}`;
/** קישור ההמשך האישי (קוד + מפתח מושב): פותח את האפליקציה שוב לאותו אדם, למשל במסך הבית באייפון */
export const resumeLink = (code: string, seat: string) => `${appLink()}#/join/${code}.${seat}`;

/** מוציא קוד (ומפתח מושב, אם יש) מקישור או מטקסט שהודבק */
export function parseInvite(text: string): { code: string; seat?: string } | null {
  const m = /(?:#\/join\/)?([a-z0-9]{10})(?:\.([a-z0-9]{24}))?\s*$/i.exec(text.trim());
  return m ? { code: m[1].toLowerCase(), seat: m[2]?.toLowerCase() } : null;
}

// ---------- כניסה עם הזמנה ----------

export async function enterWithInvite(code: string, seat?: string): Promise<{ ok: true } | { ok: false; error: InviteError }> {
  if (seat) {
    const r = await call<{ ok: boolean }>('POST', '/invites/resume', { code, seat });
    if (!r.ok) return r;
    // קישור ההמשך: אותו אדם בהקשר נוסף. בלי המלצת ההתקנה שוב
    setState((s) => ({ ...s, access: { code, seat, at: new Date().toISOString(), tipDone: true } }));
    return { ok: true };
  }
  const r = await call<{ seat: string }>('POST', '/invites/redeem', { code });
  if (!r.ok) return r;
  setState((s) => ({ ...s, access: { code, seat: r.data.seat, at: new Date().toISOString() } }));
  return { ok: true };
}

// ---------- מנהל ----------

export async function pairAdmin(setup: string) {
  const r = await call<{ token: string }>('POST', '/admin/pair', { setup });
  if (r.ok) setState((s) => ({ ...s, admin: { token: r.data.token } }));
  return r;
}

const token = () => getState().admin?.token;

export const listInvites = () => call<{ invites: Invite[] }>('GET', '/invites', undefined, token());
export const createInvite = (note?: string) => call<Invite>('POST', '/invites', { note }, token());
export const markGiven = (code: string, note?: string) => call<Invite>('PATCH', `/invites/${code}`, { given: true, note }, token());
export const revokeInvite = (code: string) => call<Invite>('DELETE', `/invites/${code}`, undefined, token());

export function leaveAdmin() {
  setState((s) => ({ ...s, admin: undefined }));
}

export const INVITE_ERRORS: Record<InviteError, string> = {
  used: 'ההזמנה הזו כבר נוצלה. כל הזמנה פותחת את האפליקציה פעם אחת, לאדם אחד. אפשר לבקש הזמנה חדשה ממי ששלח אותה.',
  invalid: 'הקישור לא תקין, או שההזמנה בוטלה. אפשר לבקש הזמנה חדשה ממי ששלח אותה.',
  network: 'אין חיבור לאינטרנט כרגע. בודקים את החיבור ומנסים שוב.',
  'slow-down': 'היו יותר מדי ניסיונות. מחכים כמה דקות ומנסים שוב.',
  'not-admin': 'מצב המנהל כבר לא פעיל במכשיר הזה. צריך להתחבר מחדש עם קוד ניהול.',
  'bad-code': 'קוד הניהול לא נכון, או שכבר השתמשו בו.',
  server: 'משהו השתבש בשרת. מנסים שוב בעוד רגע.',
};
