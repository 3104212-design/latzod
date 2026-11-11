// נעילה בקוד: מסך הנעילה, והגדרת הקוד במסך "עוד".

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { TitleMark } from './Brand';
import { Sheet } from './Sheet';
import { I } from './Icons';
import { haptic, toast } from '../lib/feedback';
import { checkPin, makeLock, RELOCK_AFTER } from '../lib/lock';
import { resetAll, setState, useAppState } from '../lib/store';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function Keypad({ onDigit, onBack, disabled }: { onDigit: (d: string) => void; onBack: () => void; disabled?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^\d$/.test(e.key)) onDigit(e.key);
      if (e.key === 'Backspace') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDigit, onBack, disabled]);

  return (
    <div className="keypad" dir="ltr">
      {KEYS.map((k, i) =>
        k === '' ? (
          <span key={i} />
        ) : (
          <button
            key={i}
            type="button"
            className="key"
            disabled={disabled}
            aria-label={k === '⌫' ? 'מחיקה' : k}
            onClick={() => (k === '⌫' ? onBack() : onDigit(k))}
          >
            {k}
          </button>
        ),
      )}
    </div>
  );
}

function Dots({ n, error }: { n: number; error?: boolean }) {
  return (
    <div className={`pin-dots${error ? ' shake' : ''}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </div>
  );
}

/** עוטף את האפליקציה: אם יש קוד, מציג מסך נעילה בפתיחה ואחרי זמן ברקע */
export function LockGate({ children }: { children: ReactNode }) {
  const s = useAppState();
  const [locked, setLocked] = useState(() => !!s.lock);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    if (!s.lock) setLocked(false);
  }, [s.lock]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (s.lock && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [s.lock]);

  if (locked && s.lock) return <LockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const s = useAppState();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [fails, setFails] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const [, tick] = useState(0);
  const [forgot, setForgot] = useState(false);
  const waiting = waitUntil > Date.now();

  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => tick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, [waiting]);

  const pinRef = useRef('');
  const busy = useRef(false);
  const failsRef = useRef(0);
  const set = (v: string) => {
    pinRef.current = v;
    setPin(v);
  };

  const onDigit = useCallback(
    (d: string) => {
      if (waiting || busy.current || pinRef.current.length >= 4) return;
      setError(false);
      const next = pinRef.current + d;
      set(next);
      if (next.length < 4) return;
      busy.current = true;
      checkPin(next, s.lock!).then((ok) => {
        busy.current = false;
        if (ok) {
          haptic(10);
          onUnlock();
          return;
        }
        haptic([40, 40, 40]);
        setError(true);
        set('');
        failsRef.current += 1;
        setFails(failsRef.current);
        if (failsRef.current % 5 === 0) setWaitUntil(Date.now() + 30000);
      });
    },
    [s.lock, onUnlock, waiting],
  );

  const onBack = useCallback(() => set(pinRef.current.slice(0, -1)), []);

  return (
    <div className="lock-screen" role="dialog" aria-modal="true" aria-label="האפליקציה נעולה">
      <TitleMark height={110} />
      <p className="lock-hint">{waiting ? `יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${Math.ceil((waitUntil - Date.now()) / 1000)} שניות.` : error ? 'הקוד לא נכון. נסו שוב.' : 'הקלידו את הקוד'}</p>
      <Dots n={pin.length} error={error} />
      <Keypad onDigit={onDigit} onBack={onBack} disabled={waiting} />
      {fails >= 3 && (
        <button className="lock-forgot" onClick={() => setForgot(true)}>
          שכחתי את הקוד
        </button>
      )}
      {forgot && (
        <Sheet title="שכחתי את הקוד" onClose={() => setForgot(false)}>
          <div className="card">
            <p>
              מטעמי פרטיות אין דרך לשחזר את הקוד. האפשרות היחידה היא למחוק את כל הנתונים במכשיר הזה ולהתחיל מחדש. אם שמרת
              גיבוי לקובץ, אפשר לשחזר ממנו אחר כך.
            </p>
          </div>
          <button
            className="btn btn-danger btn-block"
            onClick={() => {
              if (confirm('כל הנתונים במכשיר יימחקו לצמיתות. אי אפשר לבטל את זה. למחוק?')) {
                resetAll();
                location.hash = '#/';
              }
            }}
          >
            מחיקת הנתונים והתחלה מחדש
          </button>
        </Sheet>
      )}
    </div>
  );
}

/** הגדרת הקוד במסך "עוד" */
export function LockSettings() {
  const s = useAppState();
  const [setting, setSetting] = useState(false);
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setSetting(false);
    setFirst('');
    pinRef.current = '';
    setPin('');
    setError('');
  };

  const pinRef = useRef('');
  const setP = (v: string) => {
    pinRef.current = v;
    setPin(v);
  };

  const onDigit = useCallback(
    (d: string) => {
      if (pinRef.current.length >= 4) return;
      setError('');
      const next = pinRef.current + d;
      setP(next);
      if (next.length < 4) return;
      setTimeout(async () => {
        if (!first) {
          setFirst(next);
          setP('');
        } else if (first === next) {
          const lock = await makeLock(next);
          setState((st) => ({ ...st, lock }));
          reset();
          toast('הנעילה בקוד הופעלה.');
        } else {
          setFirst('');
          setP('');
          setError('הקודים לא תאמו. מתחילים מחדש.');
        }
      }, 150);
    },
    [first],
  );

  return (
    <section className="card">
      <p className="card-label">נעילה בקוד</p>
      <p className="muted small">
        קוד של 4 ספרות שמסתיר את האפליקציה ממי שמחזיק בטלפון. הנעילה חוזרת אחרי 2 דקות ברקע. היא לא מצפינה את הנתונים.
      </p>
      {s.lock ? (
        <div className="row">
          <span className="pill ok">
            {I.check({ size: 15 })}
            הנעילה פעילה
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirm('לבטל את הנעילה בקוד?')) {
                setState((st) => ({ ...st, lock: undefined }));
                toast('הנעילה בוטלה.');
              }
            }}
          >
            ביטול הנעילה
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setSetting(true)}>
          הגדרת קוד
        </button>
      )}
      {setting && (
        <Sheet title={first ? 'שוב, לאישור' : 'בחירת קוד'} onClose={reset}>
          <div className="card lock-setup">
            <p>{error || (first ? 'הקלידו את אותו הקוד שוב.' : 'בחרו 4 ספרות שקל לזכור וקשה לנחש.')}</p>
            <Dots n={pin.length} error={!!error} />
            <Keypad onDigit={onDigit} onBack={() => setP(pinRef.current.slice(0, -1))} />
          </div>
        </Sheet>
      )}
    </section>
  );
}
