// ביקורים: היום האחרון שבו האפליקציה נפתחה, כדי לקבל בחום מי שחוזר אחרי הפסקה.

import { useSyncExternalStore } from 'react';
import { diffDays, todayISO } from './dates';
import { createBus } from './feedback';
import { getState, setState } from './store';

/** כמה ימים עברו מהביקור הקודם, אם עברו לפחות 3 (אחרת 0) */
const gapBus = createBus<number>(0);

/** נקרא כשהאפליקציה נפתחת וכשהיום מתחלף */
export function noteVisit() {
  const s = getState();
  if (!s.onboarded) return;
  const today = todayISO();
  if (s.lastSeen === today) return;
  const gap = s.lastSeen ? diffDays(s.lastSeen, today) : 0;
  if (gap >= 3) gapBus.set(gap);
  setState((x) => ({ ...x, lastSeen: today }));
}

export function useWelcomeGap(): number {
  return useSyncExternalStore(gapBus.subscribe, gapBus.get, gapBus.get);
}

export function dismissWelcome() {
  gapBus.set(0);
}
