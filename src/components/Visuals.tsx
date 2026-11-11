// רכיבים חזותיים: עקבות הצעדים והחוגה (כמו בכריכת הספר).

import type { CSSProperties, ReactNode } from 'react';

function Footprint({ style, flip }: { style: CSSProperties; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 260" style={{ ...style, transform: `${style.transform ?? ''} ${flip ? 'scaleX(-1)' : ''}` }} aria-hidden="true">
      {/* סוליה */}
      <path d="M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z" />
      {/* עקב */}
      <rect x="18" y="174" width="84" height="66" rx="26" />
    </svg>
  );
}

/** עקבה קטנה אחת (סמל), בצבע הטקסט. flip: הרגל השנייה */
export function FootIcon({ flip, className }: { flip?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 260" aria-hidden="true" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <path fill="currentColor" d="M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z" />
      <rect fill="currentColor" x="18" y="174" width="84" height="66" rx="26" />
    </svg>
  );
}

/** עקבות גדולות ברקע האזור הירוק */
export function Feet() {
  return (
    <div className="feet" aria-hidden="true">
      <Footprint style={{ width: 150, top: -40, insetInlineStart: -36, transform: 'rotate(-14deg)' }} />
      <Footprint flip style={{ width: 130, bottom: -70, insetInlineEnd: -30, transform: 'rotate(12deg)' }} />
    </div>
  );
}

interface DialProps {
  total: number;
  /** לכל יום: 'done' | 'checked' | 'none' */
  states: ('done' | 'checked' | 'none')[];
  current: number; // 1-based, 0 = אין
  children?: ReactNode;
  label: string;
}

/** חוגה של סימונים, סימון לכל יום בחודש של הצעד */
export function Dial({ total, states, current, children, label }: DialProps) {
  const cx = 100;
  const cy = 100;
  const ticks = Array.from({ length: total }, (_, i) => {
    // מתחילים למעלה ומתקדמים עם כיוון השעון
    const a = (-90 + (i * 360) / total) * (Math.PI / 180);
    const isCur = i + 1 === current;
    const st = states[i] ?? 'none';
    const r1 = isCur ? 76 : st === 'done' ? 80 : 84;
    const r2 = 96;
    return (
      <line
        key={i}
        x1={cx + r1 * Math.cos(a)}
        y1={cy + r1 * Math.sin(a)}
        x2={cx + r2 * Math.cos(a)}
        y2={cy + r2 * Math.sin(a)}
        stroke="#fff"
        strokeWidth={isCur ? 6 : st === 'done' ? 5 : 3}
        strokeLinecap="round"
        opacity={isCur || st === 'done' ? 1 : st === 'checked' ? 0.7 : 0.32}
      />
    );
  });
  return (
    <div className="dial" role="img" aria-label={label}>
      <svg viewBox="0 0 200 200">{ticks}</svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}

export const Icon = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
  clean: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="14" r="7" />
      <path d="M12 14V10.5M10 3h4M12 3v4" />
      <path d="M18.5 7.5l1.2-1.2" />
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="8" cy="7" rx="3" ry="4.2" />
      <rect x="5.6" y="12" width="4.8" height="3.6" rx="1.8" />
      <ellipse cx="16" cy="11" rx="3" ry="4.2" />
      <rect x="13.6" y="16" width="4.8" height="3.6" rx="1.8" />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6z" />
      <path d="M6 3.5v17M9.5 8h5.5M9.5 11.5h5.5" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </svg>
  ),
};
