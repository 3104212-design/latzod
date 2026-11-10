// תקציר הספירות למסך "היום": ימים נקיים ואבן הדרך הבאה, עם קישור למסך הספירה.

import { useNow } from '../lib/hooks';
import { breakdown, durationLabel, elapsedMs, nextMilestone } from '../lib/sobriety';
import { useAppState } from '../lib/store';

export function daysWord(n: number): string {
  if (n === 1) return 'יום נקי';
  if (n === 2) return 'יומיים נקיים';
  return 'ימים נקיים';
}

export function TrackerSummary() {
  const s = useAppState();
  const now = useNow(60000);

  if (!s.trackers.length) {
    return (
      <a className="card summary-empty" href="#/clean">
        <span>
          <b>ספירת ימים נקיים</b>
          <span className="muted small" style={{ display: 'block' }}>
            להתחיל לספור, ולראות כמה כסף וזמן נחסכו
          </span>
        </span>
        <span aria-hidden="true">‹</span>
      </a>
    );
  }

  return (
    <a className="card tracker-summary" href="#/clean">
      {s.trackers.map((t) => {
        const ms = elapsedMs(t.since, now);
        const { days, hours } = breakdown(ms);
        const next = nextMilestone(ms);
        return (
          <div key={t.id} className="counter">
            <div className="counter-num">{days.toLocaleString('he-IL')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {daysWord(days)}
                {s.trackers.length > 1 || t.name !== 'ההתמכרות שלי' ? ` · ${t.name}` : ''}
              </div>
              <div className="counter-sub">
                {next ? `אבן הדרך הבאה: ${next.label} · עוד ${durationLabel(next.remainingMs)}` : `${hours} מתוך 24 השעות של היום`}
              </div>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${next ? Math.min(100, next.progress * 100) : (hours / 24) * 100}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </a>
  );
}
