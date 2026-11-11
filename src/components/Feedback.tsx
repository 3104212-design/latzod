// הודעות קצרות וחגיגות, מוצגות מעל כל המסכים.

import { useEffect, useMemo, useRef } from 'react';
import { dismissToast, endCelebration, useCelebration, useToasts } from '../lib/feedback';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                dismissToast(t.id);
                t.action!.run();
              }}
            >
              {t.action.label}
            </button>
          )}
          {!t.ms && (
            <button className="toast-close" aria-label="סגירה" onClick={() => dismissToast(t.id)}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const COLORS = ['#ffffff', '#c9f1c4', '#ffd76a', '#8fd391', '#f6b3a2'];

function Particles({ count }: { count: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 120 + Math.random() * 220;
        return {
          i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 60,
          r: Math.round(Math.random() * 540 - 270),
          d: 700 + Math.random() * 700,
          c: COLORS[i % COLORS.length],
          foot: i % 4 === 0,
          s: 0.6 + Math.random() * 0.8,
        };
      }),
    [count],
  );
  return (
    <div className="particles" aria-hidden="true">
      {parts.map((p) => (
        <span
          key={p.i}
          className={p.foot ? 'p-foot' : 'p-dot'}
          style={
            {
              '--x': `${p.x}px`,
              '--y': `${p.y}px`,
              '--r': `${p.r}deg`,
              '--d': `${p.d}ms`,
              '--s': p.s,
              background: p.foot ? undefined : p.c,
              color: p.c,
            } as React.CSSProperties
          }
        >
          {p.foot && (
            <svg viewBox="0 0 120 240">
              <path fill="currentColor" d="M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z" />
              <rect fill="currentColor" x="18" y="174" width="84" height="66" rx="26" />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}

export function CelebrationLayer() {
  const c = useCelebration();
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (c?.size === 'big') btn.current?.focus();
    if (!c || c.size !== 'big') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && endCelebration();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c]);

  if (!c) return null;

  if (c.size === 'small') {
    return (
      <div className="celebrate-small" key={c.id} aria-live="polite">
        <Particles count={18} />
        <div className="celebrate-pill">{c.title}</div>
      </div>
    );
  }

  return (
    <div className="celebrate-big" key={c.id} role="dialog" aria-modal="true" aria-labelledby="cel-title" onClick={endCelebration}>
      <Particles count={36} />
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <div className="celebrate-badge" aria-hidden="true">
          <svg viewBox="0 0 120 240">
            <path fill="currentColor" d="M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z" />
            <rect fill="currentColor" x="18" y="174" width="84" height="66" rx="26" />
          </svg>
        </div>
        <h2 id="cel-title">{c.title}</h2>
        {c.text && <p>{c.text}</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          {c.share && (
            <button
              className="btn btn-primary"
              onClick={() => {
                c.share!();
              }}
            >
              שיתוף
            </button>
          )}
          <button ref={btn} className="btn btn-ghost" onClick={endCelebration}>
            המשך
          </button>
        </div>
      </div>
    </div>
  );
}
