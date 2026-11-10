// המסלול: 12 הצעדים כדרך צעידה, וגם מסך של צעד בודד עם מפת הימים שלו.

import { HEBREW_MONTHS, STEPS, getStep } from '../content/steps';
import { TopBar } from '../components/Chrome';
import { TitleBadge } from '../components/Brand';
import { formatShort, todayISO } from '../lib/dates';
import { positionFor, stepDates, type TrackSettings } from '../lib/program';
import { trackOf, useAppState, type AppState } from '../lib/store';

function stepLabel(n: number, s: AppState, dates: string[]) {
  if (s.mode === 'calendar') return `${HEBREW_MONTHS[n - 1]} ${dates[0].slice(0, 4)}`;
  return `חודש ${n} · ${formatShort(dates[0])} עד ${formatShort(dates[dates.length - 1])}`;
}

function track(s: AppState): TrackSettings {
  return trackOf(s);
}

export function PathScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const today = todayISO();
  const cur = positionFor(today, track(s));

  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <h1>המסלול</h1>
        <p>12 צעדים · 12 חודשים · 24 שעות</p>
      </div>
      <div className="stack" style={{ paddingBottom: 0 }}>
        <details className="card bookmark">
          <summary>
            <TitleBadge height={44} />
            <span>
              <b>הסימניה</b>
              <br />
              <span className="muted small">רק להיום, בכל אחד מהצעדים</span>
            </span>
            <span className="chev" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="bookmark-list">
            {STEPS.map((st) => (
              <div key={st.number} className={cur?.step === st.number ? 'current' : undefined}>
                <div className="bm-step">צעד {st.number}</div>
                <p className="bm-text">{st.commitment}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
      <div className="trail">
        {STEPS.map((step) => {
          const dates = stepDates(step.number, today, track(s));
          const done = dates.filter((d) => s.days[d]?.done).length;
          const isCur = cur?.step === step.number;
          const complete = done === dates.length;
          return (
            <a
              key={step.number}
              href={`#/step/${step.number}`}
              className={`trail-item${isCur ? ' current' : ''}${complete ? ' complete' : ''}`}
            >
              <span className="trail-node">{complete ? '✓' : step.number}</span>
              <div className="card trail-card">
                <div className="trail-top">
                  <span className="trail-month">
                    {stepLabel(step.number, s, dates)}
                    {isCur ? ' · עכשיו' : ''}
                  </span>
                  <span className="small muted">
                    {done}/{dates.length}
                  </span>
                </div>
                <div className="trail-name">{step.name}</div>
                <div className="trail-principle">{step.principle}</div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${(done / dates.length) * 100}%` }} />
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}

export function StepScreen({ step: n, onSos }: { step: number; onSos: () => void }) {
  const s = useAppState();
  const step = getStep(n);
  const today = todayISO();
  const dates = stepDates(n, today, track(s));
  const done = dates.filter((d) => s.days[d]?.done).length;

  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <a href="#/path" className="small">
          חזרה למסלול
        </a>
        <h1>{step.name}</h1>
        <p>
          {stepLabel(n, s, dates)} · {step.principle}
        </p>
      </div>
      <div className="stack">
        <div className="card">
          <p className="card-label">נוסח הצעד</p>
          <p className="step-text">{step.text}</p>
        </div>

        <div className="card opener">
          <p className="motto">{step.motto}</p>
          <p>{step.intro}</p>
          <div className="page-chip" style={{ marginBottom: 0 }}>
            בספר: מעמוד {step.bookFirstPage}
          </div>
        </div>

        <div className="card">
          <p className="card-label">
            ימי הצעד · {done} מתוך {dates.length} הושלמו
          </p>
          <div className="days-grid">
            {dates.map((d, i) => {
              const rec = s.days[d];
              const cls = [
                'day-cell',
                rec?.done ? 'done' : '',
                !rec?.done && rec?.checkin ? 'checked' : '',
                d === today ? 'today' : '',
                d > today ? 'future' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <a key={d} href={d === today ? '#/' : `#/day/${d}`} className={cls} aria-label={`יום ${i + 1}, ${formatShort(d)}`}>
                  {i + 1}
                </a>
              );
            })}
          </div>
          <div className="legend">
            <span>
              <i style={{ background: 'var(--green)' }} />
              הושלם
            </span>
            <span>
              <i style={{ border: '2px solid var(--green)' }} />
              התחייבות בלבד
            </span>
            <span>
              <i style={{ outline: '2px solid var(--green-deep)' }} />
              היום
            </span>
          </div>
        </div>

        <div className="card">
          <p className="card-label">שאלות לחודש</p>
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {step.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <p className="card-label">תפילת הצעד</p>
          <p className="prayer">{step.prayer}</p>
        </div>

        {step.appendices && (
          <div className="card">
            <p className="card-label">נספחים בספר שעוזרים בצעד הזה</p>
            <ul className="ref-list">
              {step.appendices.map((a) => (
                <li key={a.page}>
                  <span>{a.title}</span>
                  <span className="muted">עמוד {a.page}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
