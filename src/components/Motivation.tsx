// כפתור "מוטיבציה" בסרגל העליון (ליד "עזרה עכשיו"), וחלון של משפטים מעוצבים:
// קודם משפט היום, ואחריו בכל לחיצה משפט אחר ועיצוב אחר, בלי חזרות עד שהמשפטים נגמרים.

import { useMemo, useState, type CSSProperties } from 'react';
import { Sheet } from './Sheet';
import { I } from './Icons';
import { FootIcon } from './Visuals';
import { MOTIVATION, lineOfTheDay } from '../content/motivation';
import { todayISO } from '../lib/dates';
import { haptic, toast } from '../lib/feedback';

const VARIANTS = 6;

export function MotivationButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="moti-btn" onClick={() => setOpen(true)} aria-label="מוטיבציה: משפט לדרך">
        {I.sparkle({ size: 18 })}
        <span>מוטיבציה</span>
      </button>
      {open && <MotivationSheet onClose={() => setOpen(false)} />}
    </>
  );
}

function MotivationSheet({ onClose }: { onClose: () => void }) {
  const today = todayISO();
  // משפט היום ראשון, ואחריו כל השאר בסדר אקראי
  const order = useMemo(() => {
    const first = lineOfTheDay(today);
    const rest = MOTIVATION.map((_, i) => i).filter((i) => i !== first);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [first, ...rest];
  }, [today]);
  const [k, setK] = useState(0);
  const text = MOTIVATION[order[k % order.length]];
  // העיצוב מתחלף עם כל משפט. נקודת ההתחלה משתנה מיום ליום
  const variant = (Number(today.slice(-2)) + k) % VARIANTS;

  const share = async () => {
    const body = `${text}\n\nרק להיום · לצעוד לתוך היום`;
    if (navigator.share) {
      try {
        await navigator.share({ text: body });
      } catch {
        /* בוטל */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(body);
      toast('המשפט הועתק. אפשר להדביק ולשלוח.');
    } catch {
      toast('לא הצלחנו להעתיק את המשפט.');
    }
  };

  return (
    <Sheet title="משפט לדרך" onClose={onClose}>
      <div className="moti-stage" aria-live="polite">
        <figure className={`moti-card mv-${variant}`} key={k}>
          <MotiDeco variant={variant} />
          {k === 0 && <span className="moti-tag">המשפט של היום</span>}
          <blockquote className="moti-text">{text}</blockquote>
          <figcaption className="moti-foot">
            <FootIcon />
            רק להיום
          </figcaption>
        </figure>
      </div>
      <div className="moti-actions">
        <button type="button" className="btn btn-ghost moti-side" onClick={() => setK(k - 1)} disabled={k === 0} aria-label="המשפט הקודם">
          {I.back()}
        </button>
        <button
          type="button"
          className="btn btn-primary moti-next"
          onClick={() => {
            haptic(10);
            setK((x) => x + 1);
          }}
        >
          {I.sparkle({ size: 18 })} עוד משפט
        </button>
        <button type="button" className="btn btn-ghost moti-side" onClick={share} aria-label="שיתוף המשפט">
          {I.share()}
        </button>
      </div>
    </Sheet>
  );
}

/** קישוט קטן לכל עיצוב: שמש, בועות, כוכבים, שקיעה, מירכאות ועקבות, קרני אור */
function MotiDeco({ variant }: { variant: number }) {
  // שכבה חותכת: הקישוטים יוצאים מהכרטיס בכוונה, וזה לא נחשב תוכן חתוך
  return (
    <span className="d-layer" aria-hidden="true">
      <Deco variant={variant} />
    </span>
  );
}

function Deco({ variant }: { variant: number }) {
  switch (variant) {
    case 0:
      return <span className="d-sun" />;
    case 1:
      return (
        <>
          <span className="d-bubble b1" />
          <span className="d-bubble b2" />
          <span className="d-bubble b3" />
        </>
      );
    case 2:
      return (
        <>
          <span className="d-moon">{I.moon({ size: 40 })}</span>
          {STARS.map((s, i) => (
            <span key={i} className="d-star" style={s}>
              {I.sparkle({ size: 18 })}
            </span>
          ))}
        </>
      );
    case 3:
      return <span className="d-setting" />;
    case 4:
      return (
        <>
          <span className="d-quote">”</span>
          <span className="d-trail">
            <FootIcon />
            <FootIcon flip />
            <FootIcon />
          </span>
        </>
      );
    default:
      return <span className="d-rays" />;
  }
}

const STARS: CSSProperties[] = [
  { top: '14%', right: '12%', '--d': '0s' } as CSSProperties,
  { top: '30%', left: '10%', '--d': '0.6s', scale: '0.7' } as CSSProperties,
  { bottom: '22%', right: '16%', '--d': '1.2s', scale: '0.6' } as CSSProperties,
  { bottom: '14%', left: '22%', '--d': '0.3s', scale: '0.85' } as CSSProperties,
  { top: '12%', left: '42%', '--d': '0.9s', scale: '0.5' } as CSSProperties,
];
