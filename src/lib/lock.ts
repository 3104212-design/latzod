// נעילה בקוד: הקוד נשמר רק כגיבוב (PBKDF2), לעולם לא כמו שהוא.
// הנעילה מסתירה את האפליקציה. היא לא מצפינה את הנתונים שבמכשיר.

export interface LockConfig {
  hash: string;
  salt: string;
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function hashPin(pin: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 150000 },
    key,
    256,
  );
  return toHex(bits);
}

export async function makeLock(pin: string): Promise<LockConfig> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return { salt, hash: await hashPin(pin, salt) };
}

export async function checkPin(pin: string, lock: LockConfig): Promise<boolean> {
  return (await hashPin(pin, lock.salt)) === lock.hash;
}

/** כמה זמן ברקע (באלפיות שנייה) עד שהאפליקציה ננעלת שוב */
export const RELOCK_AFTER = 2 * 60 * 1000;
