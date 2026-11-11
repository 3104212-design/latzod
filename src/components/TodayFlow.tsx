// "סדר היום": חמשת הדברים הקטנים של כל יום, כעקבות שמתמלאות. (לא "המסלול", שהוא 12 הצעדים)

import { FLOW, flowState } from '../lib/day';
import type { DayRecord } from '../lib/store';
import { FootIcon } from './Visuals';
import { CardTag } from './CardTag';
import { I } from './Icons';

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
    <nav className="card flow cat cat-flow" aria-label="סדר היום">
      <CardTag icon={I.list({ size: 18 })} as="p">
        סדר היום
      </CardTag>
      <div className="flow-head">
        <svg className="flow-ring" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r={r} className="track" />
          <circle cx="28" cy="28" r={r} className="fill" strokeDasharray={c} strokeDashoffset={c * (1 - n / 5)} />
        </svg>
        <span className="flow-count" aria-hidden="true">
          {n}/5
        </span>
        <span>
          <b>{n === 5 ? 'הכל נעשה היום' : `הבא בתור: ${FLOW[nextIdx].label}`}</b>
          <span className="muted small">{n === 5 ? 'כל החמישה נעשו. כל הכבוד.' : 'לוחצים על עקבה כדי לעבור אליה'}</span>
        </span>
      </div>
      <ol className="flow-steps">
        {FLOW.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              className={`flow-step cat-${f.cat}${st[i] ? ' done' : ''}${i === nextIdx ? ' next' : ''}`}
              onClick={() => go(f.id)}
              aria-label={`${f.label}: ${st[i] ? 'נעשה' : 'עוד לא'}`}
            >
              {/* עקבה לכל צעד, ימין ושמאל לסירוגין, כמו הליכה */}
              <span className={`flow-foot${i % 2 ? ' alt' : ''}`} aria-hidden="true">
                <FootIcon flip={i % 2 === 1} />
              </span>
              <span className="flow-label">{f.short}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
