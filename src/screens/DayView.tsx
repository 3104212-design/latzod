// מסך היום: הלב של האפליקציה. מציג את העבודה של יום אחד במסלול.

import { HEBREW_MONTHS } from '../content/steps';
import { TrackerSummary } from '../components/CleanCounter';
import { EveningReview } from '../components/EveningReview';
import { TopBar } from '../components/Chrome';
import { Dial, Feet } from '../components/Visuals';
import { ContentEditor } from './ContentEditor';
import { addDays, formatHebrew, formatLong, fromISO, todayISO, type ISODate } from '../lib/dates';
import { positionFor, resolveDay, stepDates } from '../lib/program';
import { go, replaceRoute } from '../lib/router';
import { trackOf, useAppState, type DayRecord } from '../lib/store';
import { useEffect, useRef, useState } from 'react';
import { InstallCard } from '../components/Install';
import { TodayFlow } from '../components/TodayFlow';
import { PledgeChallenge } from '../components/Challenge';
import { DailyWalk } from '../components/DailyWalk';
import { WelcomeBack } from '../components/WelcomeBack';
import { WeekReadyCard, WeekSheet } from '../components/WeekSummary';
import { FootIcon } from '../components/Visuals';
import { I } from '../components/Icons';
import { FLOW, flowState, greeting, nextFlowIndex, updateWithFlow } from '../lib/day';
import { celebrate, haptic } from '../lib/feedback';

export function DayView({ date, onSos, autoWalk }: { date: ISODate; onSos: () => void; autoWalk?: boolean }) {
  const s = useAppState();
  const today = todayISO();
  const isToday = date === today;
  const isFuture = date > today;
  const track = trackOf(s);
  const pos = positionFor(date, track);
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canPrev = !!positionFor(prev, track);
  const dayHref = (d: ISODate) => (d === today ? '#/' : `#/day/${d}`);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const [walk, setWalk] = useState(!!autoWalk);
  // #/walk הופך ל-#/ מיד, כדי שרענון או "חזרה" לא יפתחו את הצעידה שוב
  useEffect(() => {
    if (autoWalk) replaceRoute('#/');
  }, [autoWalk]);
  const [week, setWeek] = useState(false);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dy) > 50) return;
    // בעברית מדפדפים קדימה בהחלקה ימינה
    if (dx > 0) go(dayHref(addDays(date, 1)));
    else if (positionFor(addDays(date, -1), trackOf(s))) go(dayHref(addDays(date, -1)));
    haptic(8);
  };

  const dates = (
    <div className="hero-dates">
      {isToday && <span className="greeting">{greeting(s.name)}</span>}
      {/* שדה התאריך שקוף ומונח מעל הטקסט: לחיצה פותחת את בורר התאריך של המכשיר, גם באייפון */}
      <span className="date-jump-wrap">
        <span className="date-jump" aria-hidden="true">
          {formatLong(date)}
          <span className="heb">{formatHebrew(date)}</span>
        </span>
        <input
          ref={dateInput}
          type="date"
          className="date-jump-input"
          aria-label={`${formatLong(date)}. מעבר לתאריך אחר`}
          value={date}
          onClick={(e) => {
            const el = e.currentTarget;
            try {
              if (typeof el.showPicker === 'function') el.showPicker();
            } catch {
              /* אייפון פותח את הבורר לבד בלחיצה */
            }
          }}
          onChange={(e) => e.target.value && go(dayHref(e.target.value))}
        />
      </span>
    </div>
  );

  if (!pos) {
    return (
      <>
        <TopBar onHero onSos={onSos} />
        <section className="hero">
          <Feet />
          {dates}
          <h1 className="hero-step" style={{ marginTop: 24 }}>
            המסלול מתחיל ב{formatLong(s.startDate!)}
          </h1>
          <p>עד אז אפשר להתכונן: לקרוא את ההקדמה, למצוא קבוצה ולבחור ספונסר.</p>
          <a className="back-today" href="#/more">
            שינוי תאריך ההתחלה
          </a>
        </section>
      </>
    );
  }

  const content = resolveDay(pos, s.content);
  const rec = s.days[date] ?? {};
  const stepDays = stepDates(pos.step, date, track);
  const states = stepDays.map((d) => (s.days[d]?.done ? 'done' : s.days[d]?.checkin ? 'checked' : 'none') as 'done' | 'checked' | 'none');
  const monthName = s.mode === 'calendar' ? HEBREW_MONTHS[fromISO(date).getMonth()] : null;

  // השאלות שעליהן ענו נשמרות יחד עם התשובות, כדי שהתשובה תישאר צמודה לשאלה שלה
  const questions = rec.questions?.length ? rec.questions : content.questions;
  const setAnswer = (i: number, v: string) =>
    updateWithFlow(
      date,
      (d) => {
        const answers = [...(d.answers ?? [])];
        answers[i] = v;
        return { ...d, answers, questions: d.questions?.length ? d.questions : content.questions };
      },
      true,
    );

  return (
    <>
      <TopBar onHero onSos={onSos} />
      <section className="hero" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <Feet />
        {dates}
        <div className="hero-nav">
          <button className="icon-btn" disabled={!canPrev} onClick={() => go(dayHref(prev))} aria-label="היום הקודם">
            {I.back()}
          </button>
          <Dial
            total={pos.length}
            states={states}
            current={pos.day}
            label={`יום ${pos.day} מתוך ${pos.length} ב${content.step.name}`}
          >
            <span className="dial-of">יום</span>
            <span className="dial-num">{pos.day}</span>
            <span className="dial-of">מתוך {pos.length}</span>
          </Dial>
          <button className="icon-btn" onClick={() => go(dayHref(next))} aria-label="היום הבא">
            {I.forward()}
          </button>
        </div>
        <h1 className="hero-step">{content.step.name}</h1>
        <span className="hero-principle">{content.step.principle}</span>
        {isToday && <WalkCta rec={rec} onOpen={() => setWalk(true)} />}
        {!isToday && (
          <div>
            <a className="back-today" href="#/">
              חזרה להיום
            </a>
          </div>
        )}
      </section>

      <div className="stack">
        {isToday && <WelcomeBack />}
        {isToday && <WeekReadyCard onOpen={() => setWeek(true)} />}

        <div className="card commit" id="sec-pledge">
          <div className="commit-title">רק להיום · 24 שעות</div>
          <p className="bm-text">{content.step.commitment}</p>
          {isToday &&
            (rec.checkin ? (
              <div className="done-state">
                {I.check({ size: 20 })} ההתחייבות נרשמה ב-
                {new Date(rec.checkin).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            ) : (
              <button
                className="btn btn-primary btn-pledge"
                onClick={() => {
                  const all = updateWithFlow(date, (d) => ({ ...d, checkin: new Date().toISOString() }), true);
                  if (!all) celebrate({ size: 'small', title: 'רק להיום. 24 שעות מתחילות עכשיו.' });
                }}
              >
                מתחייבים לעוד 24 שעות
              </button>
            ))}
        </div>

        {!isFuture && <TodayFlow rec={rec} />}

        {isToday && <PledgeChallenge />}

        {isToday && <TrackerSummary />}

        {isToday && <InstallCard banner />}

        {isToday && s.reasons.length > 0 && <ReasonOfTheDay date={date} />}

        {pos.day === 1 && (
          <div className="card opener">
            <p className="card-label">פותחים את {content.step.name}</p>
            <p className="motto">{content.step.motto}</p>
            <p>{content.step.intro}</p>
          </div>
        )}

        <div className="card">
          <p className="card-label">הצעד של החודש{monthName ? ` · ${monthName}` : ''}</p>
          <p className="step-text">{content.step.text}</p>
          <a href={`#/step/${pos.step}`} className="small">
            לכל הצעד ולמפת הימים ›
          </a>
        </div>

        <div className="card" id="sec-read">
          <p className="card-label">
            הקריאה היומית
            {content.isDraft && <span className="draft-badge">טיוטה</span>}
          </p>
          {content.title && <h2>{content.title}</h2>}
          {content.page != null && (
            <div className="page-chip">
              בספר: {content.bookDate ? `${content.bookDate} · ` : ''}עמוד {content.page}
            </div>
          )}
          {content.reading && <p className="reading">{content.reading}</p>}
          {!content.hasReading &&
            (content.page != null ? (
              <p>
                הקריאה של היום נמצאת בספר
                {content.bookDate ? `, בדף של ${content.bookDate}` : ''} (עמוד {content.page}). קוראים, ואז עונים על
                השאלון.
              </p>
            ) : (
              <p className="muted">
                הקריאה של היום עוד לא נוספה לאפליקציה. בינתיים אפשר להתעכב על נוסח הצעד ועל השאלות.
              </p>
            ))}
          {content.isDraft && (
            <p className="muted small draft-note">טקסט זמני שנכתב במיוחד לאפליקציה. יוחלף בקריאה מהספר.</p>
          )}
          {!isFuture && (
            <button
              type="button"
              className={`check-btn${rec.read ? ' on' : ''}`}
              aria-pressed={!!rec.read}
              onClick={() => {
                haptic(10);
                updateWithFlow(date, (d) => ({ ...d, read: !d.read }), true);
              }}
            >
              <span className="check-dot" aria-hidden="true">
                {rec.read && I.check({ size: 16 })}
              </span>
              {rec.read ? 'קראתי' : 'סימון: קראתי'}
            </button>
          )}
        </div>

        <div className="card questionnaire" id="sec-questions">
          <p className="card-label">שאלון להיום</p>
          {isFuture && <p className="muted small">השאלון ייפתח ביום הזה. רק להיום.</p>}
          {questions.map((q, i) => (
            <div className="q" key={i}>
              <label htmlFor={`q-${i}`}>{q}</label>
              <textarea
                id={`q-${i}`}
                value={rec.answers?.[i] ?? ''}
                disabled={isFuture}
                onChange={(e) => setAnswer(i, e.target.value)}
              />
            </div>
          ))}
          <div className="q">
            <label htmlFor="note">מה עוד עולה בי היום?</label>
            <textarea
              id="note"
              value={rec.note ?? ''}
              disabled={isFuture}
              onChange={(e) => updateWithFlow(date, (d) => ({ ...d, note: e.target.value }), true)}
            />
          </div>
          <p className="saved-hint">נשמר אוטומטית, ורק במכשיר הזה.</p>
        </div>

        <div className="card" id="sec-prayer">
          <p className="card-label">תפילה להיום</p>
          <p className="prayer">{content.prayer}</p>
          {!isFuture && (
            <button
              type="button"
              className={`check-btn${rec.prayed ? ' on' : ''}`}
              aria-pressed={!!rec.prayed}
              onClick={() => {
                haptic(10);
                updateWithFlow(date, (d) => ({ ...d, prayed: !d.prayed }), true);
              }}
            >
              <span className="check-dot" aria-hidden="true">
                {rec.prayed && I.check({ size: 16 })}
              </span>
              {rec.prayed ? 'אמן. אמרתי את התפילה' : 'סימון: אמרתי את התפילה'}
            </button>
          )}
        </div>

        {!isFuture && (
          <div id="sec-review">
            <EveningReview key={date} date={date} onSaved={(r) => updateWithFlow(date, (d) => ({ ...d, review: r }), true)} />
          </div>
        )}

        {s.editorMode && (
          <ContentEditor key={pos.key} contentKey={pos.key} label={`${content.step.name}, יום ${pos.day}`} />
        )}
      </div>
      {walk && <DailyWalk date={date} onSos={onSos} onClose={() => setWalk(false)} />}
      {week && <WeekSheet initialOffset={-1} onClose={() => setWeek(false)} />}
    </>
  );
}

/** הכפתור בראש מסך היום: מתחיל את הצעידה, או ממשיך מהצעד הבא. כשהכל נעשה, הוא נעלם */
function WalkCta({ rec, onOpen }: { rec: DayRecord; onOpen: () => void }) {
  const next = nextFlowIndex(rec);
  if (next >= FLOW.length) return null;
  const started = flowState(rec).some(Boolean);
  const label = !started ? 'לצעוד לתוך היום' : next === 4 ? 'לסיכום הערב' : `להמשיך לצעוד · ${FLOW[next].label}`;
  return (
    <div>
      <button className="walk-cta" onClick={onOpen}>
        <FootIcon className="walk-cta-foot" />
        {label}
        {I.forward({ size: 18 })}
      </button>
    </div>
  );
}

/** סיבה אחת מהרשימה האישית, מתחלפת כל יום */
function ReasonOfTheDay({ date }: { date: ISODate }) {
  const s = useAppState();
  const n = Math.abs(date.split('-').reduce((a, x) => a * 31 + Number(x), 7));
  const r = s.reasons[n % s.reasons.length];
  return (
    <div className="card reason-today">
      {r.photo && <img src={r.photo} alt="" />}
      <span>
        <span className="card-label">למה בחרתי בדרך הזו</span>
        {r.text && <span className="reason-today-text">{r.text}</span>}
      </span>
    </div>
  );
}
