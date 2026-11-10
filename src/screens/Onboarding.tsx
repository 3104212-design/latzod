// מסכי פתיחה: היכרות, בחירת מסלול וספירת ימים נקיים.

import { useState } from 'react';
import { HEBREW_MONTHS, getStep } from '../content/steps';
import { Dial, Feet } from '../components/Visuals';
import { PublisherLogo, TitleMark } from '../components/Brand';
import { todayISO } from '../lib/dates';
import { setState, type AppState } from '../lib/store';
import { uid } from '../lib/sobriety';
import type { Mode } from '../lib/program';

export function Onboarding() {
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<Mode>('calendar');
  const [startDate, setStartDate] = useState(todayISO());
  const [cleanSince, setCleanSince] = useState('');
  const [cleanName, setCleanName] = useState('');
  const month = new Date().getMonth();

  const finish = () => {
    setState((s): AppState => ({
      ...s,
      onboarded: true,
      joinedAt: s.joinedAt ?? todayISO(),
      mode,
      startDate: mode === 'personal' ? startDate : s.startDate,
      trackers: cleanSince
        ? [...s.trackers, { id: uid(), name: cleanName.trim() || 'ההתמכרות שלי', since: cleanSince, history: [] }]
        : s.trackers,
    }));
    location.hash = '#/';
  };

  const dots = (
    <div className="dots" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i === stage ? 'on' : ''} />
      ))}
    </div>
  );

  return (
    <div className="onb">
      <section className="hero onb-hero">
        <Feet />
        {stage === 0 ? (
          <>
            <Dial total={60} states={[]} current={0} label="לצעוד לתוך היום">
              <TitleMark height="58%" />
            </Dial>
            <div className="onb-slogan">רק להיום | 24 שעות</div>
            <div className="onb-sub">
              12 צעדים | 12 חודשים | 24 שעות
              <br />
              התמדה יומיומית | דרך ומסלול צעידה מסודר
            </div>
          </>
        ) : (
          <h1 className="hero-step" style={{ padding: '12px 0 4px' }}>
            {stage === 1 ? 'איך צועדים?' : 'עוד דבר אחד'}
          </h1>
        )}
      </section>

      <div className="onb-body">
        {stage === 0 && (
          <>
            <div className="card">
              <p>
                כל חודש צעד אחד. כל יום קריאה קצרה, שאלון ותפילה. ובכל בוקר התחייבות אחת: <b>רק להיום</b>.
              </p>
              <p className="muted small">
                כל מה שנכתב כאן נשמר רק במכשיר הזה. אין הרשמה, אין חשבון ואין שרת.
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <div className="onb-credit">
              <PublisherLogo height={34} />
              <span>
                מבוסס על הספר "לצעוד לתוך היום"
                <br />
                הוצאת ספרים לפרוש כנפיים
              </span>
            </div>
            {dots}
            <button className="btn btn-primary btn-block" onClick={() => setStage(1)}>
              מתחילים
            </button>
          </>
        )}

        {stage === 1 && (
          <>
            <label className="choice">
              <input type="radio" name="onb-mode" checked={mode === 'calendar'} onChange={() => setMode('calendar')} />
              <span>
                <b>לפי לוח השנה, כמו בספר</b>
                <span className="muted small">
                  ינואר הוא הצעד הראשון ודצמבר הוא השנים עשר. עכשיו {HEBREW_MONTHS[month]}, כלומר {getStep(month + 1).name}.
                </span>
              </span>
            </label>
            <label className="choice">
              <input type="radio" name="onb-mode" checked={mode === 'personal'} onChange={() => setMode('personal')} />
              <span>
                <b>מסלול אישי מיום ההתחלה</b>
                <span className="muted small">מתחילים מהצעד הראשון בתאריך שבוחרים, וכל צעד נמשך חודש.</span>
              </span>
            </label>
            {mode === 'personal' && (
              <div className="field">
                <label htmlFor="onb-start">תאריך ההתחלה</label>
                <input id="onb-start" type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
              </div>
            )}
            <p className="muted small">אפשר לשנות את זה בכל זמן בלשונית "עוד".</p>
            <div style={{ flex: 1 }} />
            {dots}
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setStage(0)}>
                חזרה
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStage(2)}>
                המשך
              </button>
            </div>
          </>
        )}

        {stage === 2 && (
          <>
            <div className="card">
              <div className="field">
                <label htmlFor="onb-clean">ספירת ימים נקיים (לא חובה)</label>
                <p className="muted small">מאיזה רגע לספור? אפשר להשאיר ריק ולהוסיף אחר כך.</p>
                <input id="onb-clean" type="datetime-local" value={cleanSince} onChange={(e) => setCleanSince(e.target.value)} />
              </div>
              {cleanSince && (
                <div className="field">
                  <label htmlFor="onb-clean-name">ממה מתנקים? (לא חובה)</label>
                  <input
                    id="onb-clean-name"
                    type="text"
                    placeholder="למשל: אלכוהול, הימורים, עישון"
                    value={cleanName}
                    onChange={(e) => setCleanName(e.target.value)}
                  />
                  <p className="muted small" style={{ marginTop: 6 }}>
                    בלשונית "ספירה" אפשר להוסיף עוד ספירות, ולראות כמה כסף וזמן נחסכו.
                  </p>
                </div>
              )}
            </div>
            <div className="card">
              <p className="muted small">
                האפליקציה היא כלי עזר אישי שמלווה את העבודה בצעדים. היא לא מחליפה קבוצה, ספונסר או טיפול מקצועי. ברגע
                קשה, הכפתור "עזרה עכשיו" נמצא תמיד למעלה.
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {dots}
            <div className="row">
              <button className="btn btn-ghost" onClick={() => setStage(1)}>
                חזרה
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={finish}>
                לצעוד לתוך היום
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
