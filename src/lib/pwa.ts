// התקנה כאפליקציה ועדכונים: כפתור ההתקנה של הדפדפן, זיהוי אייפון, והודעה כשיש גרסה חדשה.

import { useSyncExternalStore } from 'react';
import { createBus, toast } from './feedback';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** הדפדפן מציע התקנה (אנדרואיד, מחשב) */
  canPrompt: boolean;
  /** האפליקציה פתוחה כאפליקציה מותקנת */
  standalone: boolean;
  /** אייפון או אייפד: מתקינים דרך "הוספה למסך הבית" */
  ios: boolean;
}

let deferred: InstallPromptEvent | null = null;

const standaloneNow = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const bus = createBus<PwaState>({ canPrompt: false, standalone: standaloneNow(), ios: isIOS });
const update = (p: Partial<PwaState>) => bus.set({ ...bus.get(), ...p });

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  update({ canPrompt: true });
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  update({ canPrompt: false, standalone: true });
  toast('האפליקציה הותקנה. אפשר לפתוח אותה ממסך הבית.');
});

matchMedia('(display-mode: standalone)').addEventListener?.('change', () => update({ standalone: standaloneNow() }));

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  update({ canPrompt: false });
  return outcome === 'accepted';
}

export function usePwa(): PwaState {
  return useSyncExternalStore(bus.subscribe, bus.get, bus.get);
}

/** רישום ה-service worker, והודעה כשגרסה חדשה נכנסה לתוקף */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;
  let shown = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || shown) return;
    shown = true;
    toast('יצאה גרסה חדשה של האפליקציה.', { action: { label: 'רענון', run: () => location.reload() } });
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // בודקים עדכונים כשחוזרים לאפליקציה
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
      })
      .catch(() => {});
  });
}
