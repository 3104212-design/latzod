// "השבוע שלי": מבט על שבוע אחד (ראשון עד שבת). ימים, התחייבויות, ימים נקיים, מצב רוח ומה הפעיל.

import { useState } from 'react';
import { Sheet } from './Sheet';
import { FootIcon } from './Visuals';
import { I } from './Icons';
import { addDays, formatShort, fromISO, toISO, todayISO, type ISODate } from '../lib/dates';
import { daysLabel, MOODS } from '../lib/sobriety';
import { setState, useAppState, type AppState } from '../lib/store';

const DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** יום ראשון של השבוע שבו נמצא התאריך */
export function weekStart(d: ISODate): ISODate {
  return addDays(d, -fromISO(d).getDay());
}

const words = (t?: string) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

export interface WeekStats {
  start: ISODate;
  days: { date: ISODate; state: 'done' | 'checked' | 'none' | 'future'; mood?: number }[];
  pledged: number;
  done: number;
  clean: number;
  reviews: number;
  mood?: (typeof MOODS)[number];
  topTrigger?: [string, number];
  words: number;
  cravings: number;
  /** כמה ימים מהשבוע כבר עברו (כולל היום) */
  elapsed: number;
}

export function weekStats(s: AppState, start: ISODate, today = todayISO()): WeekStats {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = addDays(start, 7);
  let pledged = 0;
  let done = 0;
  let clean = 0;
  let reviews = 0;
  let wordCount = 0;
  const moods: number[] = [];
  const triggers = new Map<string, number>();
  const days = dates.map((date) => {
    const r = s.days[date];
    if (date > today) return { date, state: 'future' as const };
    if (r?.checkin) pledged++;
    if (r?.done) done++;
    if (r?.review) {
      reviews++;
      if (r.review.clean) clean++;
      if (r.review.mood) moods.push(r.review.mood);
      for (const t of r.review.triggers) triggers.set(t, (triggers.get(t) ?? 0) + 1);
    }
    wordCount += (r?.answers ?? []).reduce((a, x) => a + words(x), 0) + words(r?.note);
    return { date, state: r?.done ? ('done' as const) : r?.checkin ? ('checked' as const) : ('none' as const), mood: r?.review?.mood };
  });
  const weekCravings = s.cravings.filter((c) => {
    // התאריך המקומי של הרישום (at נשמר ב-UTC)
    const d = toISO(new Date(c.at));
    return d >= start && d < end;
  });
  for (const c of weekCravings) for (const t of c.triggers) triggers.set(t, (triggers.get(t) ?? 0) + 1);
  const avg = moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : 0;
  const top = [...triggers.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    start,
    days,
    pledged,
    done,
    clean,
    reviews,
    mood: MOODS.find((m) => m.value === avg),
    topTrigger: top,
    words: wordCount,
    cravings: weekCravings.length,
    elapsed: dates.filter((d) => d <= today).length,
  };
}

/** משפט לסיום, לפי איך השבוע הלך. בלי ציון ובלי ביקורת */
function closingLine(w: WeekStats, current: boolean): string {
  if (w.done >= 5) return 'שבוע של התמדה. ככה צועדים, יום אחרי יום.';
  if (w.pledged >= 4) return 'רוב הימים התחילו בהתחייבות. זה הבסיס של הכל.';
  if (w.pledged >= 1) return 'כל יום שהתחייבת בו הוא צעד. ממשיכים, רק להיום.';
  return current ? 'השבוע עוד לפניך. רק להיום.' : 'שבוע חדש הוא התחלה חדשה. רק להיום.';
}

/** שבעה ימים כשורת עקבות */
export function WeekStrip({ w }: { w: WeekStats }) {
  return (
    <ol className="week-strip">
      {w.days.map((d, i) => {
        const label = d.state === 'done' ? 'הושלם' : d.state === 'checked' ? 'התחייבות' : d.state === 'future' ? 'עוד לא הגיע' : 'בלי סימון';
        return (
          <li key={d.date} className={`week-day ${d.state}`} aria-label={`${formatShort(d.date)}: ${label}`}>
            <span className="week-foot" aria-hidden="true">
              <FootIcon flip={i % 2 === 1} />
            </span>
            <span className="week-letter" aria-hidden="true">
              {DAY_LETTERS[i]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function WeekSheet({ onClose, initialOffset = 0 }: { onClose: () => void; initialOffset?: number }) {
  const s = useAppState();
  const [offset, setOffset] = useState(initialOffset);
  const today = todayISO();
  const start = addDays(weekStart(today), offset * 7);
  const w = weekStats(s, start, today);
  const current = offset === 0;
  const range = `${formatShort(start)} עד ${formatShort(addDays(start, 6))}`;

  return (
    <Sheet title={current ? 'השבוע שלי' : offset === -1 ? 'השבוע שעבר' : 'שבוע קודם'} onClose={onClose}>
      <div className="card week-card">
        <div className="week-nav">
          <button className="icon-btn soft" onClick={() => setOffset(offset - 1)} aria-label="שבוע קודם">
            {I.back()}
          </button>
          <span className="week-range">{range}</span>
          <button className="icon-btn soft" disabled={current} onClick={() => setOffset(offset + 1)} aria-label="שבוע הבא">
            {I.forward()}
          </button>
        </div>
        <WeekStrip w={w} />
        <div className="week-legend muted small" aria-hidden="true">
          <span>
            <i className="lg done" /> הושלם
          </span>
          <span>
            <i className="lg checked" /> התחייבות
          </span>
        </div>
      </div>

      <div className="stats">
        <div className="card stat">
          <b>
            {w.done}/{w.elapsed}
          </b>
          <span>ימים שהושלמו</span>
        </div>
        <div className="card stat">
          <b>{w.pledged}</b>
          <span>התחייבויות</span>
        </div>
        <div className="card stat">
          <b>{w.clean}</b>
          <span>ימים נקיים שסוכמו</span>
        </div>
      </div>

      <div className="card week-facts">
        <p>
          <span aria-hidden="true">{w.mood?.emoji ?? '·'}</span>
          {w.mood ? `מצב הרוח הממוצע: ${w.mood.label}` : 'מצב הרוח יופיע כאן אחרי סיכומי ערב.'}
        </p>
        <p>
          <span aria-hidden="true">{I.pen()}</span>
          {w.words ? `נכתבו ${w.words.toLocaleString('he-IL')} מילים ביומן` : 'עוד לא נכתב ביומן השבוע.'}
        </p>
        {w.topTrigger && (
          <p>
            <span aria-hidden="true">{I.flag()}</span>
            מה הכי הפעיל: {w.topTrigger[0]} ({w.topTrigger[1] === 1 ? 'פעם אחת' : `${w.topTrigger[1]} פעמים`})
          </p>
        )}
        {w.cravings > 0 && (
          <p>
            <span aria-hidden="true">{I.heart()}</span>
            {w.cravings === 1 ? 'דחף אחד נרשם' : `${w.cravings} דחפים נרשמו`} בחלון "עזרה עכשיו"
          </p>
        )}
      </div>

      <p className="week-closing">{closingLine(w, current)}</p>
    </Sheet>
  );
}

/** כרטיס במסך היום, בתחילת שבוע: הסיכום של השבוע שעבר מוכן */
export function WeekReadyCard({ onOpen }: { onOpen: () => void }) {
  const s = useAppState();
  const today = todayISO();
  const prev = addDays(weekStart(today), -7);
  // מוצג ביום ראשון ושני, פעם אחת לכל שבוע, ורק אם היה משהו בשבוע שעבר
  if (fromISO(today).getDay() > 1 || s.weekSeen === prev) return null;
  const w = weekStats(s, prev, today);
  if (!w.pledged && !w.reviews) return null;
  const seen = () => setState((x) => ({ ...x, weekSeen: prev }));
  return (
    <div className="card week-ready">
      <button
        className="week-ready-main"
        onClick={() => {
          seen();
          onOpen();
        }}
      >
        <span className="card-label">הסיכום השבועי מוכן</span>
        <span className="week-ready-text">
          {w.done ? `${daysLabel(w.done)} שהושלמו בשבוע שעבר` : `${w.pledged === 1 ? 'התחייבות אחת' : `${w.pledged} התחייבויות`} בשבוע שעבר`}. לצפייה
        </span>
      </button>
      <button className="close-btn" onClick={seen} aria-label="הסתרת הסיכום השבועי">
        {I.close()}
      </button>
    </div>
  );
}
