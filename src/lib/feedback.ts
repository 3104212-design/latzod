// משוב למשתמש: הודעות קצרות (toast), רטט, וחגיגות.

import { useSyncExternalStore } from 'react';

// ---------- מאגר קטן שאפשר להאזין לו ----------
function createBus<T>(initial: T) {
  let value = initial;
  const ls = new Set<() => void>();
  return {
    get: () => value,
    set(v: T) {
      value = v;
      ls.forEach((l) => l());
    },
    subscribe(l: () => void) {
      ls.add(l);
      return () => ls.delete(l);
    },
  };
}

// ---------- הודעות קצרות ----------
export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  /** אלפיות שנייה. 0 = עד שסוגרים */
  ms: number;
}

const toastBus = createBus<Toast[]>([]);
let seq = 0;

export function toast(text: string, opts: { action?: Toast['action']; ms?: number } = {}) {
  const t: Toast = { id: ++seq, text, action: opts.action, ms: opts.ms ?? (opts.action ? 0 : 3200) };
  toastBus.set([...toastBus.get().filter((x) => x.text !== text), t]);
  if (t.ms) setTimeout(() => dismissToast(t.id), t.ms);
}

export function dismissToast(id: number) {
  toastBus.set(toastBus.get().filter((t) => t.id !== id));
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(toastBus.subscribe, toastBus.get, toastBus.get);
}

// ---------- רטט ----------
export function haptic(pattern: number | number[] = 12) {
  try {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(pattern);
  } catch {
    /* מכשירים בלי רטט */
  }
}

// ---------- חגיגות ----------
export interface Celebration {
  id: number;
  title: string;
  text?: string;
  /** small: הבזק קצר. big: מסך חגיגה עם כפתורים */
  size: 'small' | 'big';
  share?: () => void;
}

const celebrateBus = createBus<Celebration | null>(null);

export function celebrate(c: Omit<Celebration, 'id'>) {
  celebrateBus.set({ ...c, id: ++seq });
  haptic(c.size === 'big' ? [20, 60, 30, 60, 40] : 18);
  if (c.size === 'small') setTimeout(() => celebrateBus.get()?.size === 'small' && celebrateBus.set(null), 2200);
}

export function endCelebration() {
  celebrateBus.set(null);
}

export function useCelebration(): Celebration | null {
  return useSyncExternalStore(celebrateBus.subscribe, celebrateBus.get, celebrateBus.get);
}

export { createBus };
