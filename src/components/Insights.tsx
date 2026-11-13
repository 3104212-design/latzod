// תובנות: רצף התחייבויות, מצב רוח לאורך זמן, טריגרים נפוצים ושעות קשות.

import { addDays, formatShort, todayISO } from '../lib/dates';
import { MOODS } from '../lib/sobriety';
import { useAppState, type AppState } from '../lib/store';

/** רצף ההתחייבויות: ימים רצופים עם "רק להיום" (היום נספר אם כבר התחייבו בו, אחרת מתחילים מאתמול) */
export function pledgeStreak(s: AppState): number {
  let d = todayISO();
  if (!s.days[d]?.checkin) d = addDays(d, -1);
  let n = 0;
  while (s.days[d]?.checkin) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

const PARTS = [
  { label: 'בוקר', from: 5, to: 12 },
  { label: 'צהריים', from: 12, to: 17 },
  { label: 'ערב', from: 17, to: 22 },
  { label: 'לילה', from: 22, to: 29 },
];

function partOf(h: number) {
  const hh = h < 5 ? h + 24 : h;
  return PARTS.findIndex((p) => hh >= p.from && hh < p.to);
}

export function Insights() {
  const s = useAppState();
  const today = todayISO();
  const records = Object.entries(s.days);
  const reviews = records.filter(([, r]) => r.review).map(([d, r]) => ({ date: d, ...r.review! }));
  const doneDays = records.filter(([, r]) => r.done).length;

  // טריגרים מסיכומי הערב וממה שנרשם בחלון "עזרה עכשיו"
  const counts = new Map<string, number>();
  for (const r of reviews) for (const t of r.triggers) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const c of s.cravings) for (const t of c.triggers) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const tr of s.trackers) for (const h of tr.history) for (const t of h.triggers ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMax = top[0]?.[1] ?? 1;

  const byPart = PARTS.map(() => 0);
  for (const c of s.cravings) {
    const i = partOf(new Date(c.at).getHours());
    if (i >= 0) byPart[i]++;
  }
  const partMax = Math.max(1, ...byPart);

  // מהיום אחורה: היום מימין למעלה, וכך הימים שמולאו מתחילים בראש הרשת ולא בסופה
  // קשר ודחף, בחודש האחרון: רק ימים שבהם נשאלה (ונענתה) שאלת הקשר
  const month = reviews.filter((r) => r.date > addDays(today, -30) && r.connection !== undefined);
  const withC = month.filter((r) => r.connection!.length > 0);
  const without = month.filter((r) => r.connection!.length === 0);
  const avg = (xs: typeof month) => {
    const v = xs.filter((r) => r.craving != null);
    return v.length >= 2 ? v.reduce((a, r) => a + (r.craving ?? 0), 0) / v.length : null;
  };
  const avgWith = avg(withC);
  const avgWithout = avg(without);
  const people = new Map<string, number>();
  for (const r of withC) for (const c of r.connection!) people.set(c, (people.get(c) ?? 0) + 1);
  const topPeople = [...people.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const recent = reviews.filter((r) => r.date > addDays(today, -7) && r.craving != null);
  const avgCraving = recent.length ? recent.reduce((a, r) => a + (r.craving ?? 0), 0) / recent.length : null;

  return (
    <>
      <div className="stats">
        <div className="card stat cat-challenge">
          <b>{pledgeStreak(s)}</b>
          <span>רצף התחייבויות</span>
        </div>
        <div className="card stat cat-pledge">
          <b>{doneDays}</b>
          <span>ימים שהושלמו</span>
        </div>
        <div className="card stat cat-review">
          <b>{reviews.filter((r) => r.clean).length}</b>
          <span>ימים נקיים שסוכמו</span>
        </div>
      </div>

      <div className="card cat-review">
        <p className="card-label">מצב הרוח בשבועיים האחרונים</p>
        <div className="mood-strip">
          {last14.map((d) => {
            const r = s.days[d]?.review;
            const m = MOODS.find((x) => x.value === r?.mood);
            return (
              <a
                key={d}
                href={d === today ? '#/' : `#/day/${d}`}
                className={`mood-cell m${r?.mood ?? 0}${r && !r.clean ? ' slip' : ''}${d === today ? ' today' : ''}`}
                title={`${d === today ? 'היום' : formatShort(d)}${m ? `: ${m.label}` : ''}`}
                aria-label={`${d === today ? 'היום' : formatShort(d)}${m ? `: ${m.label}` : ': בלי סיכום'}`}
              >
                <span aria-hidden="true">{m?.emoji ?? ''}</span>
              </a>
            );
          })}
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          {avgCraving != null
            ? `עוצמת הדחף הממוצעת בשבוע האחרון: ${avgCraving.toFixed(1)} מתוך 10.`
            : 'מילוי "סיכום היום" בכל ערב יציג כאן את התמונה לאורך זמן.'}
        </p>
      </div>

      {month.length > 0 && (
        <div className="card cat-read connect-card">
          <p className="card-label">קשר ודחף</p>
          <p className="connect-count">
            <b>{withC.length}</b> {withC.length === 1 ? 'יום' : 'ימים'} עם קשר אמיתי
            <span className="muted"> · מתוך {month.length === 1 ? 'יום אחד' : `${month.length} ימים`} שבהם עניתי בחודש האחרון</span>
          </p>
          {avgWith != null && avgWithout != null && (
            <>
              <div className="hbars">
                <div className="hbar">
                  <span>עם קשר</span>
                  <div className="bar">
                    <span style={{ width: `${(avgWith / 10) * 100}%` }} />
                  </div>
                  <b>{avgWith.toFixed(1)}</b>
                </div>
                <div className="hbar">
                  <span>בלי קשר</span>
                  <div className="bar">
                    <span style={{ width: `${(avgWithout / 10) * 100}%` }} />
                  </div>
                  <b>{avgWithout.toFixed(1)}</b>
                </div>
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                עוצמת הדחף הממוצעת (מתוך 10).{' '}
                {avgWith < avgWithout - 0.4
                  ? 'בימים עם קשר הדחף היה חלש יותר. כדאי לזכור את זה ביום קשה.'
                  : avgWith > avgWithout + 0.4
                    ? 'הפעם הדחף לא היה חלש יותר בימים עם קשר. שווה להמשיך לשים לב.'
                    : 'בינתיים אין הבדל ברור. התמונה תתבהר עם הזמן.'}
              </p>
            </>
          )}
          {topPeople.length > 0 && (
            <p className="muted small" style={{ marginTop: 6 }}>
              הכי הרבה: {topPeople.map(([p, n]) => `${p} (${n})`).join(', ')}.
            </p>
          )}
        </div>
      )}

      <div className="card cat-questions">
        <p className="card-label">מה מפעיל אותי</p>
        {top.length ? (
          <div className="hbars">
            {top.map(([t, n]) => (
              <div key={t} className="hbar">
                <span>{t}</span>
                <div className="bar">
                  <span style={{ width: `${(n / topMax) * 100}%` }} />
                </div>
                <b>{n}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">הטריגרים שמסמנים בסיכום היום, בחלון "עזרה עכשיו" או במעידה יופיעו כאן.</p>
        )}
      </div>

      {s.cravings.length > 0 && (
        <div className="card cat-prayer">
          <p className="card-label">מתי הדחפים מגיעים</p>
          <div className="hbars">
            {PARTS.map((p, i) => (
              <div key={p.label} className="hbar">
                <span>{p.label}</span>
                <div className="bar">
                  <span style={{ width: `${(byPart[i] / partMax) * 100}%` }} />
                </div>
                <b>{byPart[i]}</b>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            {s.cravings.length === 1 ? 'לפי דחף אחד שנרשם.' : `לפי ${s.cravings.length} דחפים שנרשמו.`} כדאי לתכנן מראש מה עושים בשעות הקשות.
          </p>
        </div>
      )}
    </>
  );
}
