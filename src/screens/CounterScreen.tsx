// מסך הספירה: ימים נקיים, חיסכון, אבני דרך, רצפים, וסיבות אישיות לדרך.

import { useEffect, useRef, useState } from 'react';
import { TopBar } from '../components/Chrome';
import { ChipPicker, Sheet } from '../components/Sheet';
import { I } from '../components/Icons';
import { Dial, Feet } from '../components/Visuals';
import { Medal } from '../components/Medal';
import { CardTag } from '../components/CardTag';
import { formatLong, nowInputValue, toISO } from '../lib/dates';
import { compressImage, useNow } from '../lib/hooks';
import { celebrate, toast } from '../lib/feedback';
import { renderShareImage, shareImage } from '../lib/shareImage';
import {
  DAY_MS,
  MILESTONES,
  MILESTONE_LEVELS,
  levelOf,
  milestonesOf,
  TRIGGERS,
  breakdown,
  cleanDaysWord,
  cleanPhrase,
  daysLabel,
  durationLabel,
  elapsedMs,
  formatHours,
  formatMoney,
  hoursSaved,
  longestMs,
  moneySaved,
  needsMedicalNote,
  nextMilestone,
  parseLocal,
  type Tracker,
} from '../lib/sobriety';
import { addReason, removeReason, removeTracker, restartTracker, saveTracker, useAppState } from '../lib/store';

const pad = (n: number) => String(n).padStart(2, '0');

const NAME_SUGGESTIONS = ['אלכוהול', 'סמים', 'הימורים', 'עישון', 'כדורים', 'מסכים', 'אוכל', 'קניות'];

function timeOf(s: string) {
  const d = new Date(parseLocal(s));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateOf(s: string) {
  return formatLong(s.slice(0, 10));
}

export function CounterScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const now = useNow(1000);
  const [selId, setSelId] = useState<string | undefined>();
  const [edit, setEdit] = useState<Tracker | 'new' | null>(null);
  const [restart, setRestart] = useState<Tracker | null>(null);

  const t = s.trackers.find((x) => x.id === selId) ?? s.trackers[0];

  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <h1>הספירה</h1>
        <p>כל יום נקי נספר. רק להיום.</p>
      </div>

      <div className="stack">
        {s.trackers.length > 0 && (
          <div className="chips tracker-tabs" role="tablist">
            {s.trackers.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={x.id === t?.id}
                className={`chip${x.id === t?.id ? ' on' : ''}`}
                onClick={() => setSelId(x.id)}
              >
                {x.name}
              </button>
            ))}
            <button className="chip add" onClick={() => setEdit('new')}>
              + ספירה נוספת
            </button>
          </div>
        )}

        {!t ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="commit-title">מתחילים לספור</p>
            <p className="muted">
              מתי התחלת להיות נקי או נקייה? אפשר לספור כמה התמכרויות בנפרד, ולראות גם כמה כסף וזמן נחסכו.
            </p>
            <button className="btn btn-primary" onClick={() => setEdit('new')}>
              התחלת ספירה
            </button>
          </div>
        ) : (
          <TrackerView
            t={t}
            now={now}
            onEdit={() => setEdit(t)}
            onRestart={() => setRestart(t)}
            onShare={async (blob, days) => {
              const r = await shareImage(blob, `${cleanPhrase(daysLabel(days))}. רק להיום.`);
              if (r === 'downloaded') toast('התמונה נשמרה במכשיר. אפשר לשלוח אותה לכל מי שתרצו.');
            }}
          />
        )}

        <Reasons />
      </div>

      {edit && (
        <TrackerEditor
          tracker={edit === 'new' ? undefined : edit}
          onClose={() => setEdit(null)}
          onSaved={(id) => {
            setSelId(id);
            setEdit(null);
          }}
        />
      )}
      {restart && (
        <RestartSheet
          t={restart}
          onClose={() => setRestart(null)}
          onDone={() => {
            setRestart(null);
            celebrate({ size: 'small', title: 'מתחילים שוב. רק להיום.' });
          }}
        />
      )}
    </>
  );
}

/** "מ" לפני תווית: "משנה", "מ-3 חודשים" (לפני מספר בא מקף) */
const fromLabel = (label: string) => (/^\d/.test(label) ? `מ-${label}` : `מ${label}`);

/** סמל לכל רמה, בכמוסה של הכרטיס */
const LEVEL_ICONS = [I.sparkle, I.flag, I.heart, I.trophy];

function TrackerView({
  t,
  now,
  onEdit,
  onRestart,
  onShare,
}: {
  t: Tracker;
  now: number;
  onEdit: () => void;
  onRestart: () => void;
  onShare: (blob: Blob, days: number) => void;
}) {
  const [withName, setWithName] = useState(false);
  const [quick, setQuick] = useState<'cost' | 'hours' | null>(null);
  const ms = elapsedMs(t.since, now);
  const b = breakdown(ms);
  // התמונה מוכנה מראש, כדי שתפריט השיתוף ייפתח ישירות מהלחיצה (אייפון דורש זאת)
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const shareOpts = {
    days: b.days,
    label: cleanDaysWord(b.days),
    subtitle: withName && t.name !== 'ההתמכרות שלי' ? `מ${t.name}` : undefined,
  };
  useEffect(() => {
    let alive = true;
    setShareBlob(null);
    setShareFailed(false);
    renderShareImage(shareOpts)
      .then((blob) => alive && setShareBlob(blob))
      // אם ההכנה מראש נכשלה, מכינים בלחיצה (בלי תפריט השיתוף באייפון: הקובץ יורד)
      .catch(() => alive && setShareFailed(true));
    return () => {
      alive = false;
    };
  }, [b.days, withName, t.name]);
  const next = nextMilestone(ms);
  const best = longestMs(t, now);
  const ticks = Array.from({ length: 24 }, (_, i) => (i < b.hours ? 'done' : 'none') as 'done' | 'none');
  const days = ms / DAY_MS;

  const reached = MILESTONES.filter((m) => days >= m.days);
  const last = reached[reached.length - 1];
  const reachedOn = (d: number) => formatLong(toISO(new Date(parseLocal(t.since) + d * DAY_MS)));

  return (
    <>
      <section className="counter-hero">
        <Feet />
        <Dial total={24} states={ticks} current={b.hours + 1} label={cleanPhrase(daysLabel(b.days))}>
          <span className="dial-num">{b.days.toLocaleString('he-IL')}</span>
          <span className="dial-of">{cleanDaysWord(b.days)}</span>
        </Dial>
        {/* שעות, דקות ושניות כאריחים נפרדים, שרצים בזמן אמת */}
        <div className="time-tiles" role="img" aria-label={`ועוד ${b.hours} שעות, ${b.minutes} דקות ו-${b.seconds} שניות`}>
          <span>
            <b>{pad(b.hours)}</b>
            <small>שעות</small>
          </span>
          <span>
            <b>{pad(b.minutes)}</b>
            <small>דקות</small>
          </span>
          <span>
            <b>{pad(b.seconds)}</b>
            <small>שניות</small>
          </span>
        </div>
        <div className="counter-since">
          מאז {dateOf(t.since)}, בשעה {timeOf(t.since)}
        </div>
      </section>

      <div className="card ms-pair">
        {last && (
          <div className={`ms-row lvl-${levelOf(last.days).level}`}>
            <Medal state="got" level={levelOf(last.days).level} major={last.major} />
            <span className="ms-body">
              <span className="ms-kicker">אבן הדרך האחרונה · {levelOf(last.days).name}</span>
              <b>{last.label}</b>
              <span className="muted small">הושגה ב{reachedOn(last.days)}</span>
            </span>
          </div>
        )}
        {next ? (
          <div className={`ms-row lvl-${levelOf(next.days).level}`}>
            <Medal state="next" level={levelOf(next.days).level} major={next.major} progress={next.progress} />
            <span className="ms-body">
              <span className="ms-kicker">אבן הדרך הבאה · {levelOf(next.days).name}</span>
              <b>{next.label}</b>
              <span className="muted small">עוד {durationLabel(next.remainingMs)}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, next.progress * 100)}%` }} />
              </span>
            </span>
          </div>
        ) : (
          <p className="commit-title">כל אבני הדרך הושגו. רק להיום, עוד יום.</p>
        )}
      </div>

      <div className="stats">
        {/* כל כרטיס פותח חלון משלו: עלות יומית או זמן ביום. אפשר ללחוץ גם אחרי שיש ערך, כדי לשנות */}
        <button
          className={`card stat${t.costPerDay ? '' : ' add'}`}
          onClick={() => setQuick('cost')}
          aria-label={t.costPerDay ? `נחסכו ${formatMoney(moneySaved(t, ms))}. לשינוי העלות היומית` : 'הוספת עלות יומית'}
        >
          <span className="stat-ic">{I.coin()}</span>
          <b>{t.costPerDay ? formatMoney(moneySaved(t, ms)) : 'כסף'}</b>
          <span>{t.costPerDay ? `נחסכו · ${formatMoney(t.costPerDay)} ליום` : '+ עלות יומית'}</span>
        </button>
        <button
          className={`card stat${t.hoursPerDay ? '' : ' add'}`}
          onClick={() => setQuick('hours')}
          aria-label={t.hoursPerDay ? `${formatHours(hoursSaved(t, ms))} חזרו אליי. לשינוי הזמן ביום` : 'הוספת זמן ביום'}
        >
          <span className="stat-ic">{I.clock()}</span>
          <b>{t.hoursPerDay ? formatHours(hoursSaved(t, ms)) : 'זמן'}</b>
          <span>{t.hoursPerDay ? `חזרו אליי · ${t.hoursPerDay} ש׳ ביום` : '+ שעות ביום'}</span>
        </button>
        <div className="card stat">
          <span className="stat-ic">{I.trophy()}</span>
          <b>{daysLabel(Math.floor(best / DAY_MS))}</b>
          <span>הרצף הארוך ביותר</span>
        </div>
      </div>

      <p className="section-title">אבני דרך</p>
      {MILESTONE_LEVELS.map((lv, li) => {
        const list = milestonesOf(lv.level);
        const gotCount = list.filter((m) => days >= m.days).length;
        const status = gotCount === list.length ? 'done' : gotCount > 0 || (next && levelOf(next.days).level === lv.level) ? 'current' : 'locked';
        return (
          <section key={lv.level} className={`card cat ms-level lvl-${lv.level} ${status}`} aria-label={`רמה ${lv.level}: ${lv.name}`}>
            <CardTag icon={LEVEL_ICONS[li]({ size: 18 })} as="p">
              רמה {lv.level} · {lv.name}
            </CardTag>
            <p className="ms-level-sub">
              {status === 'done' ? (
                <>
                  {I.check({ size: 16 })} הרמה הושלמה: {list.length === 1 ? 'אבן הדרך' : `כל ${list.length} אבני הדרך`}
                </>
              ) : status === 'current' ? (
                `${gotCount} מתוך ${list.length} אבני דרך`
              ) : (
                `${list.length} אבני דרך, ${fromLabel(list[0].label)} עד ${list[list.length - 1].label}`
              )}
            </p>
            <div className="badges">
              {list.map((m) => {
                const got = days >= m.days;
                const isNext = !got && next?.days === m.days;
                return (
                  <div
                    key={m.days}
                    className={`badge${got ? ' got' : ''}${isNext ? ' next' : ''}${m.major ? ' major' : ''}`}
                    aria-label={`${m.label}${m.major ? ' (אבן דרך מרכזית)' : ''}: ${got ? `הושגה ב${reachedOn(m.days)}` : isNext ? 'הבאה בתור' : 'עוד לא'}`}
                    role="img"
                  >
                    <Medal
                      state={got ? 'got' : isNext ? 'next' : 'future'}
                      level={lv.level}
                      major={m.major}
                      progress={isNext ? next?.progress : undefined}
                    />
                    <span className="badge-label" aria-hidden="true">
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <label className="toggle share-name">
        <span className="small">להציג בתמונת השיתוף ממה מתנקים</span>
        <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} />
      </label>
      <div className="row actions-row">
        <button
          className="btn btn-primary"
          disabled={!shareBlob && !shareFailed}
          onClick={() => {
            if (shareBlob) onShare(shareBlob, b.days);
            else if (shareFailed)
              renderShareImage(shareOpts)
                .then((blob) => onShare(blob, b.days))
                .catch(() => toast('לא הצלחנו להכין את התמונה. אפשר לנסות שוב.'));
          }}
        >
          {I.share({ size: 20 })}
          {shareBlob || shareFailed ? 'שיתוף' : 'מכינים…'}
        </button>
        <button className="btn btn-ghost" onClick={onEdit}>
          {I.edit({ size: 20 })}
          עריכה
        </button>
        <button className="btn btn-danger" onClick={onRestart}>
          מעדתי
        </button>
      </div>

      {t.history.length > 0 && (
        <div className="card">
          <p className="card-label">רצפים קודמים</p>
          <ul className="ref-list">
            {[...t.history].reverse().map((h, i) => (
              <li key={i}>
                <span>
                  {durationLabel(parseLocal(h.end) - parseLocal(h.start))}
                  {h.note && <span className="muted small" style={{ display: 'block' }}>{h.note}</span>}
                </span>
                <span className="muted small">עד {dateOf(h.end)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small" style={{ marginTop: 8 }}>
            כל רצף לימד משהו. הספירה מתחילה מחדש, הדרך ממשיכה.
          </p>
        </div>
      )}
      {quick && <QuickValueSheet t={t} kind={quick} onClose={() => setQuick(null)} />}
    </>
  );
}

const QUICK = {
  cost: {
    title: 'עלות יומית',
    question: 'כמה כסף הלך על זה ביום, בערך?',
    hint: 'לפי זה מחושב כמה כסף נחסך מאז שהתחלת. אפשר לשנות בכל זמן.',
    unit: '₪',
    presets: [20, 50, 100, 200, 500],
    field: 'costPerDay' as const,
    label: (n: number) => formatMoney(n),
  },
  hours: {
    title: 'זמן ביום',
    question: 'כמה שעות ביום הלכו על זה, בערך?',
    hint: 'כולל לחפש, להשיג, להשתמש ולהתאושש. לפי זה מחושב כמה זמן חזר אלייך.',
    unit: 'שעות',
    presets: [1, 2, 3, 5, 8],
    field: 'hoursPerDay' as const,
    label: (n: number) => (n === 1 ? 'שעה' : n === 2 ? 'שעתיים' : `${n} שעות`),
  },
};

/** חלון קטן לערך אחד: עלות יומית או זמן ביום */
function QuickValueSheet({ t, kind, onClose }: { t: Tracker; kind: 'cost' | 'hours'; onClose: () => void }) {
  const q = QUICK[kind];
  const cur = t[q.field];
  const [val, setVal] = useState(cur ? String(cur) : '');
  const n = parseFloat(val);
  const valid = Number.isFinite(n) && n > 0 && (kind === 'cost' ? n <= 100000 : n <= 24);
  const save = (v?: number) => {
    saveTracker({ ...t, [q.field]: v });
    onClose();
  };
  return (
    <Sheet title={q.title} onClose={onClose}>
      <div className="card">
        <div className="field">
          <label htmlFor="quick-val">{q.question}</label>
          <div className="quick-input">
            <input
              id="quick-val"
              type="number"
              inputMode="decimal"
              min="0"
              step={kind === 'hours' ? '0.5' : '1'}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && valid && save(n)}
            />
            <span className="quick-unit">{q.unit}</span>
          </div>
          {val && !valid && <p className="warn-note" style={{ marginTop: 8 }}>{kind === 'hours' ? 'מספר בין 0 ל-24' : 'מספר גדול מ-0'}</p>}
        </div>
        <div className="chips">
          {q.presets.map((p) => (
            <button key={p} type="button" className={`chip${n === p ? ' on' : ''}`} onClick={() => setVal(String(p))}>
              {q.label(p)}
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>
          {q.hint}
        </p>
        <button className="btn btn-primary btn-block" disabled={!valid} onClick={() => save(n)}>
          שמירה
        </button>
        {cur ? (
          <button className="btn btn-ghost btn-block" style={{ marginTop: 8 }} onClick={() => save(undefined)}>
            הסרה
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}

function TrackerEditor({ tracker, onClose, onSaved }: { tracker?: Tracker; onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState(tracker?.name ?? '');
  const [since, setSince] = useState(tracker?.since ?? nowInputValue());
  const [cost, setCost] = useState(tracker?.costPerDay ? String(tracker.costPerDay) : '');
  const [hours, setHours] = useState(tracker?.hoursPerDay ? String(tracker.hoursPerDay) : '');

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const save = () => {
    const id = saveTracker({
      id: tracker?.id,
      history: tracker?.history,
      name: name.trim() || 'ההתמכרות שלי',
      // תאריך עתידי לא הגיוני לספירה: מגבילים לרגע הזה
      since: !since || since > nowInputValue() ? nowInputValue() : since,
      costPerDay: num(cost),
      hoursPerDay: num(hours),
    });
    onSaved(id);
  };

  return (
    <Sheet title={tracker ? 'עריכת ספירה' : 'ספירה חדשה'} onClose={onClose}>
      <div className="card">
        <div className="field">
          <label htmlFor="tr-name">ממה מתנקים?</label>
          <input id="tr-name" type="text" value={name} placeholder="ההתמכרות שלי" onChange={(e) => setName(e.target.value)} />
          <div className="chips" style={{ marginTop: 8 }}>
            {NAME_SUGGESTIONS.map((n) => (
              <button key={n} type="button" className={`chip${name === n ? ' on' : ''}`} onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {needsMedicalNote(name) && (
          <p className="warn-note">
            הפסקה פתאומית של אלכוהול או של כדורי הרגעה עלולה להיות מסוכנת. כדאי להתייעץ עם רופא או רופאה לפני הגמילה
            ובמהלכה.
          </p>
        )}
        <div className="field">
          <label htmlFor="tr-since">נקי מאז</label>
          <input id="tr-since" type="datetime-local" value={since} max={nowInputValue()} onChange={(e) => setSince(e.target.value)} />
          {since > nowInputValue() && <p className="warn-note" style={{ marginTop: 8 }}>התאריך בעתיד. הספירה תתחיל מעכשיו.</p>}
        </div>
        <div className="field">
          <label htmlFor="tr-cost">כמה כסף הלך על זה ביום, בערך (₪)</label>
          <input id="tr-cost" type="number" inputMode="decimal" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tr-hours">כמה שעות ביום הלכו על זה, בערך</label>
          <input id="tr-hours" type="number" inputMode="decimal" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" onClick={save}>
          שמירה
        </button>
      </div>
      {tracker && (
        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirm(`למחוק את הספירה "${tracker.name}" ואת כל ההיסטוריה שלה? אי אפשר לבטל את זה.`)) {
              removeTracker(tracker.id);
              onClose();
            }
          }}
        >
          מחיקת הספירה
        </button>
      )}
    </Sheet>
  );
}

function RestartSheet({ t, onClose, onDone }: { t: Tracker; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const ms = elapsedMs(t.since);

  return (
    <Sheet title="מעידה היא לא סוף הדרך" onClose={onClose}>
      <div className="card">
        <p>
          הרצף של {durationLabel(ms)} לא נמחק. הוא נשמר ברצפים הקודמים, וכל מה שלמדת בו נשאר איתך. מתחילים שוב, רק
          להיום.
        </p>
        <p className="muted small">כדאי גם להתקשר עכשיו למישהו מהדרך, ולא להישאר עם זה לבד.</p>
      </div>
      <div className="card">
        <div className="field">
          <label>מה הוביל לזה? (לא חובה)</label>
          <ChipPicker options={TRIGGERS} value={triggers} onChange={setTriggers} />
        </div>
        <div className="field">
          <label htmlFor="rs-note">מה אפשר ללמוד מזה? (לא חובה)</label>
          <textarea id="rs-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            restartTracker(t.id, note, triggers);
            onDone();
          }}
        >
          מתחילים מחדש מעכשיו
        </button>
      </div>
    </Sheet>
  );
}

function Reasons() {
  const s = useAppState();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const add = () => {
    if (!text.trim() && !photo) return;
    const ok = addReason(text, photo);
    if (!ok) {
      setErr('אין מספיק מקום במכשיר לשמור את התמונה. אפשר לשמור בלי תמונה.');
      return;
    }
    setText('');
    setPhoto(undefined);
    setErr('');
  };

  return (
    <div className="card">
      <p className="card-label">למה בחרתי בדרך הזו</p>
      <p className="muted small">הסיבות שלך, במילים ובתמונות. הן יופיעו גם בחלון "עזרה עכשיו", לרגעים הקשים.</p>
      {s.reasons.length > 0 && (
        <div className="reasons">
          {s.reasons.map((r) => (
            <div key={r.id} className={`reason${r.photo ? '' : ' text-only'}`}>
              {r.photo && <img src={r.photo} alt="" />}
              {r.text && <p>{r.text}</p>}
              <button
                className="reason-del"
                aria-label="מחיקת הסיבה"
                onClick={() => confirm('למחוק את הסיבה הזו?') && removeReason(r.id)}
              >
                {I.close({ size: 18 })}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="reason-text">סיבה חדשה</label>
        <textarea
          id="reason-text"
          value={text}
          placeholder="למשל: כדי להיות שם בשביל הילדים שלי"
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {photo && <img className="reason-preview" src={photo} alt="התמונה שנבחרה" />}
      {err && <p className="warn-note">{err}</p>}
      <div className="row">
        <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          {photo ? 'החלפת תמונה' : 'הוספת תמונה'}
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={add} disabled={!text.trim() && !photo}>
          שמירה
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            setPhoto(await compressImage(f));
          } catch {
            setErr('לא הצלחנו לטעון את התמונה.');
          }
        }}
      />
    </div>
  );
}
