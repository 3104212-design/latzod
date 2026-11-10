// היומן: כל מה שנכתב בשאלון היומי, מהחדש לישן, עם נתוני התמדה.

import { getStep } from '../content/steps';
import { TopBar } from '../components/Chrome';
import { Insights } from '../components/Insights';
import { addDays, formatHebrew, formatLong, todayISO } from '../lib/dates';
import { positionFor } from '../lib/program';
import { trackOf, useAppState, type AppState } from '../lib/store';

function streak(s: AppState): number {
  const active = (d: string) => !!(s.days[d]?.checkin || s.days[d]?.done);
  let d = todayISO();
  if (!active(d)) d = addDays(d, -1);
  let n = 0;
  while (active(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function JournalScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const today = todayISO();
  const entries = Object.entries(s.days)
    .filter(([d, r]) => d <= today && ((r.answers ?? []).some((a) => a?.trim()) || r.note?.trim()))
    .sort(([a], [b]) => (a < b ? 1 : -1));
  const doneCount = Object.values(s.days).filter((r) => r.done).length;

  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <h1>יומן</h1>
        <p>התמונה לאורך זמן, וכל מה שנכתב. נשמר רק במכשיר הזה.</p>
      </div>
      <div className="stack">
        <Insights />

        <p className="section-title">
          רשומות היומן
          <span className="muted small">
            {" "}· {doneCount} ימי עבודה הושלמו · רצף פעילות {streak(s)} ימים
          </span>
        </p>

        {entries.length === 0 ? (
          <div className="card">
            <p className="muted">היומן עוד ריק. מה שייכתב בשאלון היומי יופיע כאן.</p>
            <a href="#/">לשאלון של היום</a>
          </div>
        ) : (
          entries.map(([d, r]) => {
            const pos = positionFor(d, trackOf(s));
            const text = [...(r.answers ?? []), r.note ?? ''].find((a) => a?.trim()) ?? '';
            return (
              <a key={d} className="card entry" href={d === today ? '#/' : `#/day/${d}`}>
                <div className="entry-date">{formatLong(d)}</div>
                <div className="small muted">{formatHebrew(d)}</div>
                {pos && (
                  <div className="entry-meta">
                    {getStep(pos.step).name} · יום {pos.day}
                    {r.done ? ' · ✓ הושלם' : ''}
                  </div>
                )}
                <div className="entry-text">{text}</div>
              </a>
            );
          })
        )}
      </div>
    </>
  );
}
