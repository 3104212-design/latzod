// תזכורות בוקר וערב: קובץ שנכנס ליומן של הטלפון.

import { useState } from 'react';
import { toast } from '../lib/feedback';
import { downloadReminders } from '../lib/reminders';
import { setState, useAppState } from '../lib/store';

export function RemindersCard() {
  const s = useAppState();
  const [morning, setMorning] = useState(s.reminders?.morning ?? '08:00');
  const [evening, setEvening] = useState(s.reminders?.evening ?? '21:30');

  return (
    <section className="card">
      <p className="card-label">תזכורות</p>
      <p className="muted small">
        שתי תזכורות יומיות שנכנסות ליומן של הטלפון, עם התראה: התחייבות בבוקר וסיכום בערב. אפשר לשנות או למחוק אותן ביומן בכל זמן.
      </p>
      <div className="row times">
        <div className="field">
          <label htmlFor="rem-m">בוקר</label>
          <input id="rem-m" type="time" value={morning} onChange={(e) => setMorning(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rem-e">ערב</label>
          <input id="rem-e" type="time" value={evening} onChange={(e) => setEvening(e.target.value)} />
        </div>
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          downloadReminders(morning || '08:00', evening || '21:30');
          setState((st) => ({ ...st, reminders: { morning, evening } }));
          toast('הקובץ ירד. פותחים אותו ומאשרים הוספה ליומן.');
        }}
      >
        הוספה ליומן של הטלפון
      </button>
    </section>
  );
}

const SIZES = [
  ['normal', 'רגיל'],
  ['large', 'גדול'],
  ['xlarge', 'גדול מאוד'],
] as const;

export function TextSizePicker() {
  const s = useAppState();
  const cur = s.textSize ?? 'normal';
  return (
    <div className="field">
      <label id="ts-label">גודל הטקסט</label>
      <div className="segmented" role="radiogroup" aria-labelledby="ts-label">
        {SIZES.map(([v, l], i) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={cur === v}
            className={cur === v ? 'on' : ''}
            style={{ fontSize: 14 + i * 2 }}
            onClick={() => setState((st) => ({ ...st, textSize: v }))}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
