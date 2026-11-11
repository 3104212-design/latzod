// סיכום היום (בערב): האם היום עבר נקי, מצב רוח, עוצמת הדחף וטריגרים.

import { useState } from 'react';
import { ChipPicker } from './Sheet';
import type { ISODate } from '../lib/dates';
import { MOODS, TRIGGERS } from '../lib/sobriety';
import { haptic } from '../lib/feedback';
import { updateDay, useAppState, type DayReview } from '../lib/store';

export function EveningReview({ date, onSaved }: { date: ISODate; onSaved?: (r: DayReview) => void }) {
  const s = useAppState();
  const saved = s.days[date]?.review;
  const [editing, setEditing] = useState(!saved);
  const [clean, setClean] = useState<boolean | undefined>(saved?.clean);
  const [mood, setMood] = useState<number | undefined>(saved?.mood);
  const [craving, setCraving] = useState<number>(saved?.craving ?? 0);
  const [triggers, setTriggers] = useState<string[]>(saved?.triggers ?? []);

  const save = () => {
    if (clean === undefined) return;
    const review: DayReview = { clean, mood, craving, triggers, at: new Date().toISOString() };
    if (onSaved) onSaved(review);
    else updateDay(date, (d) => ({ ...d, review }));
    haptic(12);
    setEditing(false);
  };

  if (saved && !editing) {
    const m = MOODS.find((x) => x.value === saved.mood);
    return (
      <div className="card review">
        <p className="card-label">סיכום היום</p>
        <div className="review-summary">
          <span className={`pill ${saved.clean ? 'ok' : 'warn'}`}>{saved.clean ? '✓ היום עבר נקי' : 'היום הייתה מעידה'}</span>
          {m && (
            <span className="pill">
              {m.emoji} {m.label}
            </span>
          )}
          <span className="pill">דחף {saved.craving ?? 0}/10</span>
          {saved.triggers.map((t) => (
            <span key={t} className="pill">
              {t}
            </span>
          ))}
        </div>
        {!saved.clean && (
          <p className="small" style={{ marginTop: 10 }}>
            מעידה היא לא סוף הדרך. אפשר <a href="#/clean">לעדכן את הספירה</a>, להתקשר למישהו, ולהתחיל שוב מחר בבוקר.
          </p>
        )}
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setEditing(true)}>
          עריכה
        </button>
      </div>
    );
  }

  return (
    <div className="card review">
      <p className="card-label">סיכום היום</p>
      <p className="muted small">דקה בסוף היום: איך זה הלך?</p>

      <div className="field">
        <label>היום עבר נקי?</label>
        <div className="row">
          <button type="button" className={`btn choice-btn${clean === true ? ' on' : ''}`} onClick={() => setClean(true)}>
            כן, נקי
          </button>
          <button type="button" className={`btn choice-btn${clean === false ? ' on warn' : ''}`} onClick={() => setClean(false)}>
            הייתה מעידה
          </button>
        </div>
      </div>

      <div className="field">
        <label>מצב הרוח</label>
        <div className="moods">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`mood${mood === m.value ? ' on' : ''}`}
              aria-pressed={mood === m.value}
              aria-label={m.label}
              onClick={() => setMood(m.value)}
            >
              <span aria-hidden="true">{m.emoji}</span>
              <small>{m.label}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor={`crv-${date}`}>
          עוצמת הדחף היום: <b>{craving}</b>/10
        </label>
        <input
          id={`crv-${date}`}
          type="range"
          min={0}
          max={10}
          value={craving}
          onChange={(e) => setCraving(Number(e.target.value))}
        />
      </div>

      <div className="field">
        <label>מה הפעיל אותי היום? (לא חובה)</label>
        <ChipPicker options={TRIGGERS} value={triggers} onChange={setTriggers} />
      </div>

      <button className="btn btn-primary btn-block" disabled={clean === undefined} onClick={save}>
        שמירת הסיכום
      </button>
    </div>
  );
}
