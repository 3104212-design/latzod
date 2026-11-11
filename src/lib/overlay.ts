// חלונות שנפתחים מעל המסך נסגרים גם בכפתור "חזרה" של הטלפון.
// כל חלון פתוח מוסיף רשומה להיסטוריה, ו"חזרה" סוגר את החלון העליון במקום לצאת מהמסך.

import { useEffect, useRef } from 'react';

interface Entry {
  id: string;
  close: () => void;
}

const stack: Entry[] = [];
let ignorePops = 0;

window.addEventListener('popstate', () => {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  stack.pop()?.close();
});

function push(close: () => void): () => void {
  const entry: Entry = { id: Math.random().toString(36).slice(2), close };
  stack.push(entry);
  history.pushState({ overlay: entry.id }, '');
  return () => {
    const i = stack.indexOf(entry);
    if (i < 0) return; // כבר נסגר בכפתור "חזרה"
    stack.splice(i, 1);
    if (history.state?.overlay === entry.id) {
      ignorePops++;
      history.back();
    }
  };
}

/** מחבר חלון פתוח לכפתור "חזרה". הרישום נדחה לרגע, כדי שהרכבה כפולה במצב פיתוח לא תסגור אותו */
export function useBackClose(onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    let release: (() => void) | null = null;
    const t = setTimeout(() => {
      release = push(() => ref.current());
    }, 0);
    return () => {
      clearTimeout(t);
      release?.();
    };
  }, []);
}
