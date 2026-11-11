// "סדר היום": חמשת הדברים הקטנים של כל יום, עם התקדמות. (לא "המסלול", שהוא 12 הצעדים)

import type { DayRecord } from '../lib/store';

export const FLOW = [
  { id: 'sec-pledge', label: 'התחייבות', short: 'התחייבות' },
  { id: 'sec-read', label: 'קריאה', short: 'קריאה' },
  { id: 'sec-questions', label: 'שאלון', short: 'שאלון' },
  { id: 'sec-prayer', label: 'תפילה', short: 'תפילה' },
  { id: 'sec-review', label: 'סיכום ערב', short: 'סיכום' },
] as const;

export function flowState(rec: DayRecord): boolean[] {
  const wrote = (rec.answers ?? []).some((a) => a?.trim()) || !!rec.note?.trim();
  return [!!rec.checkin, !!rec.read, wrote, !!rec.prayed, !!rec.review];
}

export function TodayFlow({ rec }: { rec: DayRecord }) {
  const st = flowState(rec);
  const n = st.filter(Boolean).length;
  const nextIdx = st.findIndex((x) => !x);
  const r = 22;
  const c = 2 * Math.PI * r;

  const go = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    // סיכום הערב עטוף ב-div, וההדגשה צריכה להיות על הכרטיס עצמו
    const el = target.classList.contains('card') ? target : (target.querySelector('.card') as HTMLElement) ?? target;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1200);
  };

  return (
    <nav className="card flow" aria-label="סדר היום">
      <div className="flow-head">
        <svg className="flow-ring" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r={r} className="track" />
          <circle cx="28" cy="28" r={r} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - n / 5)} />
        </svg>
        <span className="flow-count" aria-hidden="true">
          {n}/5
        </span>
        <span>
          <b>{n === 5 ? 'סדר היום הושלם' : 'סדר היום'}</b>
          <span className="muted small" style={{ display: 'block' }}>
            {n === 5 ? 'כל החמישה נעשו. כל הכבוד.' : nextIdx >= 0 ? `הבא בתור: ${FLOW[nextIdx].label}` : ''}
          </span>
        </span>
      </div>
      <ol className="flow-steps">
        {FLOW.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              className={`flow-step${st[i] ? ' done' : ''}${i === nextIdx ? ' next' : ''}`}
              onClick={() => go(f.id)}
              aria-label={`${f.label}: ${st[i] ? 'נעשה' : 'עוד לא'}`}
            >
              <span className="flow-dot" aria-hidden="true">
                {st[i] ? '✓' : i + 1}
              </span>
              <span className="flow-label">{f.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
