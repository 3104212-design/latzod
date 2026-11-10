// מסך היום: הלב של האפליקציה. מציג את העבודה של יום אחד במסלול.

import { HEBREW_MONTHS } from '../content/steps';
import { TrackerSummary } from '../components/CleanCounter';
import { EveningReview } from '../components/EveningReview';
import { TopBar } from '../components/Chrome';
import { Dial, Feet } from '../components/Visuals';
import { ContentEditor } from './ContentEditor';
import { addDays, formatHebrew, formatLong, fromISO, todayISO, type ISODate } from '../lib/dates';
import { positionFor, resolveDay, stepDates } from '../lib/program';
import { go } from '../lib/router';
import { trackOf, updateDay, useAppState } from '../lib/store';

export function DayView({ date, onSos }: { date: ISODate; onSos: () => void }) {
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

  const dates = (
    <div className="hero-dates">
      {formatLong(date)}
      <span className="heb">{formatHebrew(date)}</span>
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
    updateDay(date, (d) => {
      const answers = [...(d.answers ?? [])];
      answers[i] = v;
      return { ...d, answers, questions: d.questions?.length ? d.questions : content.questions };
    });

  return (
    <>
      <TopBar onHero onSos={onSos} />
      <section className="hero">
        <Feet />
        {dates}
        <div className="hero-nav">
          <button className="icon-btn" disabled={!canPrev} onClick={() => go(dayHref(prev))} aria-label="היום הקודם">
            ›
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
            ‹
          </button>
        </div>
        <h1 className="hero-step">{content.step.name}</h1>
        <span className="hero-principle">{content.step.principle}</span>
        {!isToday && (
          <div>
            <a className="back-today" href="#/">
              חזרה להיום
            </a>
          </div>
        )}
      </section>

      <div className="stack">
        <div className="card commit">
          <div className="commit-title">רק להיום · 24 שעות</div>
          <div className="bm-step">צעד {pos.step}</div>
          <p className="bm-text">{content.step.commitment}</p>
          {isToday &&
            (rec.checkin ? (
              <div className="done-state">✓ ההתחייבות של היום נרשמה</div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => updateDay(date, (d) => ({ ...d, checkin: new Date().toISOString() }))}
              >
                מתחייבים לעוד 24 שעות
              </button>
            ))}
        </div>

        {isToday && <TrackerSummary />}

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

        <div className="card">
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
        </div>

        <div className="card questionnaire">
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
              onChange={(e) => updateDay(date, (d) => ({ ...d, note: e.target.value }))}
            />
          </div>
          <p className="saved-hint">נשמר אוטומטית, ורק במכשיר הזה.</p>
        </div>

        <div className="card">
          <p className="card-label">תפילה להיום</p>
          <p className="prayer">{content.prayer}</p>
        </div>

        {!isFuture && <EveningReview key={date} date={date} />}

        {!isFuture &&
          (rec.done ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="done-state">✓ העבודה של היום הושלמה</div>
              <div>
                <button className="btn btn-ghost" onClick={() => updateDay(date, (d) => ({ ...d, done: false }))}>
                  ביטול הסימון
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-block" onClick={() => updateDay(date, (d) => ({ ...d, done: true }))}>
              סיימתי את העבודה של היום
            </button>
          ))}

        {s.editorMode && (
          <ContentEditor key={pos.key} contentKey={pos.key} label={`${content.step.name}, יום ${pos.day}`} />
        )}
      </div>
    </>
  );
}

/** סיבה אחת מהרשימה האישית, מתחלפת כל יום */
function ReasonOfTheDay({ date }: { date: ISODate }) {
  const s = useAppState();
  const n = Math.abs(date.split('-').reduce((a, x) => a * 31 + Number(x), 7));
  const r = s.reasons[n % s.reasons.length];
  return (
    <a className="card reason-today" href="#/clean">
      {r.photo && <img src={r.photo} alt="" />}
      <span>
        <span className="card-label">למה בחרתי בדרך הזו</span>
        {r.text && <span className="reason-today-text">{r.text}</span>}
      </span>
    </a>
  );
}
