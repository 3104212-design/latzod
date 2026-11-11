// כותרת של כרטיס: כמוסה בצבע של הקטגוריה, טקסט לבן, יושבת על הקצה העליון של הכרטיס.
// וכפתור סימון ("קראתי", "אמרתי") שיושב על הקצה התחתון, בצד שמאל, חצי בחוץ.
// הצבע מגיע מהמחלקה cat-* של הכרטיס (styles-v24.css).

import type { ReactNode } from 'react';
import { I } from './Icons';
import { haptic } from '../lib/feedback';

export function CardTag({ children, icon, as = 'h2' }: { children: ReactNode; icon?: ReactNode; as?: 'h2' | 'p' }) {
  const Tag = as;
  return (
    <div className="card-tag-wrap">
      <Tag className="card-tag">
        {icon}
        <span>{children}</span>
      </Tag>
    </div>
  );
}

export function FloatCheck({ on, label, doneLabel, onToggle }: { on: boolean; label: string; doneLabel: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`float-check${on ? ' on' : ''}`}
      aria-pressed={on}
      onClick={() => {
        haptic(10);
        onToggle();
      }}
    >
      <span className="check-dot" aria-hidden="true">
        {on && I.check({ size: 16 })}
      </span>
      {on ? doneLabel : label}
    </button>
  );
}
