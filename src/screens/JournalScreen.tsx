// היומן: תובנות לאורך זמן, וכל מה שנכתב: תשובות, הערות וסיכומי ערב. עם חיפוש.

import { useMemo, useState } from 'react';
import { getStep } from '../content/steps';
import { TopBar } from '../components/Chrome';
import { Insights } from '../components/Insights';
import { I } from '../components/Icons';
import { WeekSheet, weekStart, weekStats, WeekStrip } from '../components/WeekSummary';
import { formatHebrew, formatLong, todayISO } from '../lib/dates';
import { positionFor } from '../lib/program';
import { daysLabel, MOODS } from '../lib/sobriety';
import { trackOf, useAppState } from '../lib/store';

const PAGE = 30;

/** מסמן את מילת החיפוש בתוך הטקסט */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function JournalScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const today = todayISO();
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [week, setWeek] = useState(false);
  const thisWeek = weekStats(s, weekStart(today), today);
  const query = q.trim();

  const entries = useMemo(() => {
    return Object.entries(s.days)
      .filter(([d, r]) => d <= today && ((r.answers ?? []).some((a) => a?.trim()) || r.note?.trim() || r.review))
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([d, r]) => {
        const texts = [...(r.answers ?? []), r.note ?? ''].map((x) => x?.trim()).filter(Boolean) as string[];
        return { d, r, texts };
      })
      .filter(({ d, texts, r }) => {
        if (!query) return true;
        const hay = [formatLong(d), formatHebrew(d), ...texts, ...(r.review?.triggers ?? [])].join(' ').toLowerCase();
        return hay.includes(query.toLowerCase());
      });
  }, [s.days, today, query]);


  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <h1>יומן</h1>
        <p>התמונה לאורך זמן, וכל מה שנכתב. נשמר רק במכשיר הזה.</p>
      </div>
      <div className="stack">
        <button className="card week-open" onClick={() => setWeek(true)}>
          <span className="week-open-head">
            <span className="card-label">השבוע שלי</span>
            <span className="small week-open-go">
              לסיכום השבוע {I.forward({ size: 16 })}
            </span>
          </span>
          <WeekStrip w={thisWeek} />
        </button>

        <Insights />

        <p className="section-title">רשומות היומן</p>

        <div className="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="חיפוש ביומן"
            aria-label="חיפוש ביומן"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
          />
        </div>

        {entries.length === 0 ? (
          <div className="card empty">
            {query ? (
              <p className="muted">לא נמצא "{query}" ביומן.</p>
            ) : (
              <>
                <p className="muted">היומן עוד ריק. התשובות בשאלון היומי וסיכומי הערב יופיעו כאן.</p>
                <a className="btn btn-ghost" href="#/">
                  לשאלון של היום
                </a>
              </>
            )}
          </div>
        ) : (
          <>
            {query && <p className="muted small">נמצאו {daysLabel(entries.length)}</p>}
            {entries.slice(0, limit).map(({ d, r, texts }) => {
              const pos = positionFor(d, trackOf(s));
              const shown = query ? texts.find((t) => t.toLowerCase().includes(query.toLowerCase())) ?? texts[0] : texts[0];
              const mood = MOODS.find((m) => m.value === r.review?.mood);
              return (
                <a key={d} className="card entry" href={d === today ? '#/' : `#/day/${d}`}>
                  <div className="entry-top">
                    <span>
                      <span className="entry-date">{formatLong(d)}</span>
                      <span className="small muted" style={{ display: 'block' }}>
                        {formatHebrew(d)}
                      </span>
                    </span>
                    {mood && (
                      <span className="entry-mood" title={mood.label} aria-label={`מצב רוח: ${mood.label}`}>
                        {mood.emoji}
                      </span>
                    )}
                  </div>
                  <div className="entry-meta">
                    {pos && `${getStep(pos.step).name} · יום ${pos.day}`}
                    {r.done && (
                      <>
                        {' · '}
                        <span className="entry-done">{I.check({ size: 14 })}הושלם</span>
                      </>
                    )}
                    {r.review && (r.review.clean ? ' · יום נקי' : ' · הייתה מעידה')}
                  </div>
                  {shown && (
                    <div className="entry-text">
                      <Highlight text={shown} q={query} />
                    </div>
                  )}
                </a>
              );
            })}
            {entries.length > limit && (
              <button className="btn btn-ghost btn-block" onClick={() => setLimit((l) => l + PAGE)}>
                עוד רשומות ({entries.length - limit})
              </button>
            )}
          </>
        )}
      </div>
      {week && <WeekSheet onClose={() => setWeek(false)} />}
    </>
  );
}
