// אתגר ההתחייבויות: היעד הבא של רצף "רק להיום" (שבוע, שבועיים, חודש...), עם התקדמות.
// מעודד בלי ללחוץ: אם הרצף נקטע, מתחילים יעד חדש מהיום.

import { pledgeStreak } from './Insights';
import { I } from './Icons';
import { todayISO } from '../lib/dates';
import { useAppState } from '../lib/store';

const GOALS = [
  { days: 7, label: 'שבוע שלם' },
  { days: 14, label: 'שבועיים' },
  { days: 30, label: 'חודש' },
  { days: 60, label: 'חודשיים' },
  { days: 90, label: 'שלושה חודשים' },
  { days: 180, label: 'חצי שנה' },
  { days: 365, label: 'שנה' },
];

export function PledgeChallenge() {
  const s = useAppState();
  const streak = pledgeStreak(s);
  const pledgedToday = !!s.days[todayISO()]?.checkin;
  const goal = GOALS.find((g) => g.days > streak);
  if (!goal) {
    return (
      <div className="card challenge">
        <div className="challenge-head">
          <span className="challenge-ic">{I.trophy()}</span>
          <span>
            <b>שנה שלמה של "רק להיום"</b>
            <span className="muted small">{streak.toLocaleString('he-IL')} ימים ברצף. כל יום נוסף הוא מתנה.</span>
          </span>
        </div>
      </div>
    );
  }
  const left = goal.days - streak;
  const segments = goal.days <= 14;
  const text =
    streak === 0
      ? 'מתחילים היום: התחייבות אחת, ומחר עוד אחת.'
      : left === 1
        ? `עוד התחייבות אחת ל${goal.label}.`
        : `עוד ${left} התחייבויות ל${goal.label}.`;
  const label = `${streak} מתוך ${goal.days}`;
  return (
    <div className="card challenge">
      <div className="challenge-head">
        <span className="challenge-ic">{I.trophy()}</span>
        <span>
          <b>אתגר: {goal.label} של "רק להיום"</b>
          <span className="muted small">
            {text}
            {!pledgedToday && streak > 0 ? ' ההתחייבות של היום שומרת על הרצף.' : ''}
          </span>
        </span>
      </div>
      {segments ? (
        <div
          className="challenge-segs"
          style={{ gridTemplateColumns: `repeat(${goal.days}, minmax(0, 1fr))` }}
          role="img"
          aria-label={label}
        >
          {Array.from({ length: goal.days }, (_, i) => (
            <i key={i} className={i < streak ? 'on' : i === streak && !pledgedToday ? 'today' : ''} />
          ))}
        </div>
      ) : (
        <div className="bar" role="img" aria-label={label}>
          <span style={{ width: `${(streak / goal.days) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
