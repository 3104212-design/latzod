// סרגל עוצמה (דחף, 0–10): מסלול שמתמלא בירוק מימין, כמו שאר הפסים באפליקציה, ואגודל לבן.
// הסרגל הרגיל של הדפדפן נראה אחרת בכל טלפון (באנדרואיד: מסלול כהה, והאפס בצד שמאל).

import type { CSSProperties } from 'react';

export function Scale({
  id,
  min,
  max,
  value,
  onChange,
  low,
  high,
}: {
  id: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="scale">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--p': `${p}%` } as CSSProperties}
      />
      <div className="scale-ends" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
