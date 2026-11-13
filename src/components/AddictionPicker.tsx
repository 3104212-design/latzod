// "ממה מתנקים?": רשימה נפתחת של התמכרויות נפוצות, ואפשרות לכתוב לבד.
// באייפון הרשימה נפתחת כגלגל הבחירה של המערכת. השם נשמר כטקסט חופשי, כמו קודם.

import { useState } from 'react';

export const ADDICTION_GROUPS: { label: string; items: string[] }[] = [
  {
    label: 'חומרים',
    items: [
      'אלכוהול',
      'עישון',
      'וייפ וניקוטין',
      'קנאביס',
      'סמים',
      'כדורים',
      'כדורי הרגעה ושינה',
      'משככי כאבים',
      'קוקאין',
      'ממריצים',
      'קפאין',
      'סוכר',
    ],
  },
  {
    label: 'התנהגויות',
    items: [
      'הימורים',
      'מסכים',
      'טלפון ורשתות חברתיות',
      'משחקי מחשב',
      'פורנוגרפיה',
      'מין כפייתי',
      'קניות',
      'אוכל',
      'עבודה',
      'תלות ביחסים',
    ],
  },
];

const ALL = new Set(ADDICTION_GROUPS.flatMap((g) => g.items));
const OTHER = '__other';

export function AddictionPicker({
  id,
  value,
  onChange,
  placeholder = 'בחירה מהרשימה',
}: {
  id: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  // שם שלא ברשימה (נכתב ביד, או מגרסה קודמת) נפתח בכתיבה חופשית
  const [custom, setCustom] = useState(() => !!value.trim() && !ALL.has(value.trim()));
  const selected = custom ? OTHER : ALL.has(value) ? value : '';

  return (
    <>
      <div className="select-wrap">
        <select
          id={id}
          className={`select${selected ? '' : ' empty'}`}
          value={selected}
          onChange={(e) => {
            const v = e.target.value;
            if (v === OTHER) {
              setCustom(true);
              // מה שנבחר קודם מהרשימה לא נשאר כטקסט: מתחילים מתיבה ריקה
              if (ALL.has(value)) onChange('');
            } else {
              setCustom(false);
              onChange(v);
            }
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {ADDICTION_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER}>אחר: לכתוב לבד</option>
        </select>
      </div>
      {custom && (
        <input
          id={`${id}-text`}
          className="select-other"
          type="text"
          aria-label="ממה מתנקים, במילים שלי"
          placeholder="כותבים כאן, במילים שלי"
          maxLength={40}
          value={value}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </>
  );
}
