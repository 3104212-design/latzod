// ניתוב פשוט מבוסס hash, כדי שהאפליקציה תעבוד גם כקבצים סטטיים וגם אופליין.

import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'today' }
  | { name: 'day'; date: string }
  | { name: 'clean' }
  | { name: 'path' }
  | { name: 'step'; step: number }
  | { name: 'journal' }
  | { name: 'more' };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (parts[0]) {
    case 'day':
      if (parts[1] && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return { name: 'day', date: parts[1] };
      break;
    case 'clean':
      return { name: 'clean' };
    case 'path':
      return { name: 'path' };
    case 'step': {
      const n = Number(parts[1]);
      if (n >= 1 && n <= 12) return { name: 'step', step: n };
      break;
    }
    case 'journal':
      return { name: 'journal' };
    case 'more':
      return { name: 'more' };
  }
  return { name: 'today' };
}

let current = parse(location.hash);
const listeners = new Set<() => void>();

window.addEventListener('hashchange', () => {
  current = parse(location.hash);
  listeners.forEach((l) => l());
  window.scrollTo({ top: 0 });
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function go(path: string) {
  location.hash = path.startsWith('#') ? path : `#/${path.replace(/^\//, '')}`;
}
