// הצעידה היומית: מסך מלא שמוביל צעד אחר צעד בעבודה של היום.
// התחייבות, קריאה, שאלה אחת בכל פעם, תפילה וסיכום ערב, עם עקבות שמתמלאות בדרך.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { EveningReview } from './EveningReview';
import { Particles } from './Feedback';
import { pledgeStreak } from './Insights';
import { FootIcon } from './Visuals';
import type { ISODate } from '../lib/dates';
import { FLOW, flowState, greeting, isEvening, nextFlowIndex, updateWithFlow } from '../lib/day';
import { haptic } from '../lib/feedback';
import { useBackClose } from '../lib/overlay';
import { positionFor, resolveDay } from '../lib/program';
import { breakdown, cleanDaysWord, daysLabel, elapsedMs } from '../lib/sobriety';
import { getState, trackOf, useAppState, type DayRecord } from '../lib/store';

const END = FLOW.length;

/** הצעד הבא שעוד לא נעשה אחרי צעד מסוים (או מסך הסיום) */
function nextOpen(rec: DayRecord, from: number): number {
  const st = flowState(rec);
  for (let i = from + 1; i < END; i++) if (!st[i]) return i;
  return END;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export function DailyWalk({ date, onClose, onSos }: { date: ISODate; onClose: () => void; onSos: () => void }) {
  useBackClose(onClose);
  const s = useAppState();
  const pos = positionFor(date, trackOf(s));
  const rec = s.days[date] ?? {};
  const st = flowState(rec);
  const [stage, setStage] = useState(() => nextFlowIndex(rec));
  const [q, setQ] = useState(0);
  // העקבה שהתמלאה עכשיו, לאנימציה של "חותמת"
  const [just, setJust] = useState<number | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);

  // פעם אחת בפתיחה (ולא בכל רינדור: onClose מתחדש בכל רינדור של מסך היום, וזה היה מוציא את המיקוד מתיבת הכתיבה)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    // Escape סוגר את החלון העליון בלבד: אם "עזרה עכשיו" פתוח מעל הצעידה, הוא נסגר והצעידה נשארת
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('.sheet-backdrop') && closeRef.current();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  // בכל מעבר: חוזרים לראש המסך, והמיקוד עובר לכותרת (לקוראי מסך)
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    head.current?.focus({ preventScroll: true });
  }, [stage, q]);

  if (!pos) return null;
  const content = resolveDay(pos, s.content);
  const questions = rec.questions?.length ? rec.questions : content.questions;
  const qCount = questions.length + 1; // השאלות, ובסוף "מה עוד עולה בי היום?"

  const goTo = (i: number) => {
    setStage(i);
    setQ(0);
  };
  /** אחרי שצעד נעשה: חותמת על העקבה, ואז הלאה לצעד הבא שעוד לא נעשה */
  const complete = (i: number, patch: (d: DayRecord) => DayRecord) => {
    updateWithFlow(date, patch, false);
    haptic(14);
    setJust(i);
    const after = getState().days[date] ?? {};
    setTimeout(() => {
      setJust(null);
      goTo(nextOpen(after, i));
    }, 650);
  };
  const forward = () => goTo(nextOpen(getState().days[date] ?? {}, stage));
  const back = () => {
    if (stage === 2 && q > 0) setQ(q - 1);
    else if (stage > 0) {
      const to = stage - 1;
      setStage(to);
      setQ(to === 2 ? qCount - 1 : 0);
    }
  };

  const setAnswer = (i: number, v: string) =>
    updateWithFlow(
      date,
      (d) => {
        const answers = [...(d.answers ?? [])];
        answers[i] = v;
        return { ...d, answers, questions: d.questions?.length ? d.questions : content.questions };
      },
      false,
    );

  let title: string;
  let kicker: ReactNode = null;
  let main: ReactNode;
  let actions: ReactNode;

  switch (stage) {
    case 0:
      title = 'רק להיום · 24 שעות';
      kicker = greeting(s.name);
      main = (
        <>
          <p className="walk-big">{content.step.commitment}</p>
          {rec.checkin && <p className="done-state">✓ ההתחייבות נרשמה ב-{timeOf(rec.checkin)}</p>}
        </>
      );
      actions = rec.checkin ? (
        <button className="btn btn-primary walk-next" onClick={forward}>
          הלאה
        </button>
      ) : (
        <button className="btn btn-primary walk-next btn-pledge" onClick={() => complete(0, (d) => ({ ...d, checkin: new Date().toISOString() }))}>
          מתחייבים לעוד 24 שעות
        </button>
      );
      break;

    case 1:
      title = content.title ?? 'הקריאה היומית';
      kicker = (
        <>
          הקריאה היומית
          {content.isDraft && <span className="draft-badge">טיוטה</span>}
        </>
      );
      main = (
        <>
          {content.page != null && (
            <div className="page-chip">
              בספר: {content.bookDate ? `${content.bookDate} · ` : ''}עמוד {content.page}
            </div>
          )}
          {content.reading ? (
            <p className="reading walk-reading">{content.reading}</p>
          ) : (
            <p>
              {content.page != null
                ? `הקריאה של היום נמצאת בספר${content.bookDate ? `, בדף של ${content.bookDate}` : ''} (עמוד ${content.page}). קוראים, וחוזרים לכאן.`
                : 'הקריאה של היום עוד לא נוספה לאפליקציה. בינתיים אפשר להתעכב על נוסח הצעד.'}
            </p>
          )}
          {content.isDraft && <p className="muted small draft-note">טקסט זמני שנכתב במיוחד לאפליקציה. יוחלף בקריאה מהספר.</p>}
        </>
      );
      actions = rec.read ? (
        <button className="btn btn-primary walk-next" onClick={forward}>
          הלאה
        </button>
      ) : (
        <button className="btn btn-primary walk-next" onClick={() => complete(1, (d) => ({ ...d, read: true }))}>
          ✓ קראתי
        </button>
      );
      break;

    case 2: {
      const isNote = q >= questions.length;
      title = isNote ? 'מה עוד עולה בי היום?' : questions[q];
      kicker = isNote ? 'ולסיום, במילים שלי' : `שאלה ${q + 1} מתוך ${questions.length}`;
      main = (
        <>
          <label className="sr-only" htmlFor="walk-answer">
            {title}
          </label>
          <textarea
            id="walk-answer"
            key={q}
            className="walk-textarea"
            placeholder="כותבים כאן, בלי לחשוב על ניסוח"
            value={isNote ? rec.note ?? '' : rec.answers?.[q] ?? ''}
            onChange={(e) =>
              isNote ? updateWithFlow(date, (d) => ({ ...d, note: e.target.value }), false) : setAnswer(q, e.target.value)
            }
          />
          <p className="saved-hint">נשמר אוטומטית, ורק במכשיר הזה. אפשר גם לדלג.</p>
          <div className="walk-dots" aria-hidden="true">
            {Array.from({ length: qCount }, (_, i) => (
              <i key={i} className={i === q ? 'on' : (i < questions.length ? rec.answers?.[i] : rec.note)?.trim() ? 'filled' : ''} />
            ))}
          </div>
        </>
      );
      const last = q >= qCount - 1;
      actions = (
        <button
          className="btn btn-primary walk-next"
          onClick={() => {
            if (!last) return setQ(q + 1);
            const now = getState().days[date] ?? {};
            if (flowState(now)[2]) {
              setJust(2);
              haptic(14);
              setTimeout(() => {
                setJust(null);
                goTo(nextOpen(now, 2));
              }, 650);
            } else forward();
          }}
        >
          {last ? 'סיום השאלון' : 'לשאלה הבאה'}
        </button>
      );
      break;
    }

    case 3:
      title = 'תפילה להיום';
      main = <p className="walk-big walk-prayer">{content.prayer}</p>;
      actions = rec.prayed ? (
        <button className="btn btn-primary walk-next" onClick={forward}>
          הלאה
        </button>
      ) : (
        <button className="btn btn-primary walk-next" onClick={() => complete(3, (d) => ({ ...d, prayed: true }))}>
          אמן
        </button>
      );
      break;

    case 4:
      title = 'סיכום היום';
      main = (
        <>
          {!rec.review && !isEvening() && (
            <p className="walk-note">הסיכום מתאים לסוף היום. אפשר לסכם כבר עכשיו, או לחזור לכאן בערב.</p>
          )}
          <EveningReview
            key={date}
            date={date}
            onSaved={(r) => complete(4, (d) => ({ ...d, review: r }))}
          />
        </>
      );
      actions = (
        <button className="btn btn-ghost walk-next" onClick={() => goTo(END)}>
          {rec.review ? 'הלאה' : 'לסיים לעכשיו'}
        </button>
      );
      break;

    default:
      title = '';
      main = <WalkEnd st={st} />;
      actions = (
        <button className="btn btn-primary walk-next" onClick={onClose}>
          חזרה למסך היום
        </button>
      );
  }

  const n = st.filter(Boolean).length;

  return createPortal(
    <div className="walk" role="dialog" aria-modal="true" aria-label="הצעידה היומית">
      <header className="walk-top">
        <div className="walk-bar">
          <button className="icon-btn" onClick={onClose} aria-label="סגירת הצעידה">
            ✕
          </button>
          <span className="walk-stage-name">{stage < END ? `${stage + 1} מתוך 5 · ${FLOW[stage].label}` : `${n} מתוך 5`}</span>
          {/* "עזרה עכשיו" זמין גם באמצע הצעידה. החלון נפתח מעליה */}
          <button className="sos-btn walk-sos" onClick={onSos}>
            עזרה עכשיו
          </button>
        </div>
        <ol className="walk-trail">
          {FLOW.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                className={`walk-foot${st[i] ? ' done' : ''}${i === stage ? ' cur' : ''}${just === i ? ' just' : ''}${i % 2 ? ' alt' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`${f.label}: ${st[i] ? 'נעשה' : 'עוד לא'}`}
                aria-current={i === stage ? 'step' : undefined}
              >
                <FootIcon flip={i % 2 === 1} />
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div className="walk-body" ref={body}>
        <div className="walk-stage" key={`${stage}-${q}`}>
          {kicker && <p className="walk-kicker">{kicker}</p>}
          {title && (
            <h2 className="walk-title" ref={head} tabIndex={-1}>
              {title}
            </h2>
          )}
          {main}
        </div>
      </div>

      <footer className="walk-actions">
        {stage > 0 && stage < END && (
          <button className="btn btn-ghost walk-back" onClick={back} aria-label="הקודם">
            ›
          </button>
        )}
        {actions}
      </footer>
    </div>,
    document.body,
  );
}

/** מסך הסיום: מה נעשה היום, הרצף, והספירה */
function WalkEnd({ st }: { st: boolean[] }) {
  const s = useAppState();
  const n = st.filter(Boolean).length;
  const all = n === FLOW.length;
  const streak = pledgeStreak(s);
  const t = s.trackers[0];
  const days = t ? breakdown(elapsedMs(t.since)).days : null;
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    if (all) haptic([20, 60, 30, 60, 40]);
  }, [all]);

  const onlyReview = !st[4] && st.slice(0, 4).every(Boolean);
  const title = all ? 'צעדת לתוך היום' : onlyReview ? 'הבוקר מאחוריך' : 'עצירה טובה';
  const text = all
    ? 'התחייבות, קריאה, שאלון, תפילה וסיכום. צעד שלם בדרך.'
    : onlyReview
      ? 'נשאר רק סיכום הערב. הוא יחכה לך כאן, בכפתור שבראש המסך.'
      : `עשית ${n} מתוך 5. אפשר לחזור להמשך בכל רגע היום.`;

  return (
    <div className={`walk-end${all ? ' all' : ''}`}>
      {all && <Particles count={28} />}
      <div className="walk-end-feet" aria-hidden="true">
        {st.map((done, i) => (
          <span key={i} className={done ? 'done' : ''} style={{ animationDelay: `${i * 120}ms` }}>
            <FootIcon flip={i % 2 === 1} />
          </span>
        ))}
      </div>
      <h2 className="walk-title" ref={ref} tabIndex={-1}>
        {title}
      </h2>
      <p>{text}</p>
      <div className="walk-end-stats">
        {streak > 0 && (
          <div>
            <b>{daysLabel(streak)}</b>
            <span>ברצף של "רק להיום"</span>
          </div>
        )}
        {days != null && (
          <div>
            <b>{days.toLocaleString('he-IL')}</b>
            <span>{cleanDaysWord(days)}</span>
          </div>
        )}
      </div>
      <p className="walk-end-motto">רק להיום.</p>
    </div>
  );
}
