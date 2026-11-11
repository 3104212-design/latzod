// חלון תחתון כללי (bottom sheet), נסגר בלחיצה על הרקע או ב-Escape.

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBackClose } from '../lib/overlay';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useBackClose(onClose);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // המיקוד עובר לחלון, ואחרי הסגירה חוזר למקום שבו היה
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus({ preventScroll: true });
    return () => prevFocus?.focus?.({ preventScroll: true });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // החלון מוצג ישירות תחת body, כדי ששום מסך או אנימציה לא יגבילו את המיקום שלו
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button ref={closeBtn} className="close-btn" onClick={onClose} aria-label="סגירה">
            ✕
          </button>
        </div>
        <div className="stack" style={{ padding: 0 }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** בחירה מרובה של תגיות (טריגרים) */
export function ChipPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={`chip${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
