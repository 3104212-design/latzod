// מסך הספירה: ימים נקיים, חיסכון, אבני דרך, רצפים, וסיבות אישיות לדרך.

import { useRef, useState } from 'react';
import { TopBar } from '../components/Chrome';
import { ChipPicker, Sheet } from '../components/Sheet';
import { Dial, Feet } from '../components/Visuals';
import { formatLong, nowInputValue, toISO } from '../lib/dates';
import { compressImage, useNow } from '../lib/hooks';
import { celebrate, toast } from '../lib/feedback';
import { renderShareImage, shareImage } from '../lib/shareImage';
import {
  DAY_MS,
  MILESTONES,
  TRIGGERS,
  breakdown,
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
            onShare={async (days, withName) => {
              try {
                const blob = await renderShareImage({
                  days,
                  label: days === 1 ? 'יום נקי' : 'ימים נקיים',
                  subtitle: withName && t.name !== 'ההתמכרות שלי' ? `מ${t.name}` : undefined,
                });
                const r = await shareImage(blob, `${daysLabel(days)} נקיים. רק להיום.`);
                if (r === 'downloaded') toast('התמונה נשמרה במכשיר. אפשר לשלוח אותה לכל מי שתרצו.');
              } catch {
                toast('לא הצלחנו ליצור את התמונה.');
              }
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
  onShare: (days: number, withName: boolean) => void;
}) {
  const [withName, setWithName] = useState(false);
  const ms = elapsedMs(t.since, now);
  const b = breakdown(ms);
  const next = nextMilestone(ms);
  const best = longestMs(t, now);
  const ticks = Array.from({ length: 24 }, (_, i) => (i < b.hours ? 'done' : 'none') as 'done' | 'none');
  const days = ms / DAY_MS;

  return (
    <>
      <section className="counter-hero">
        <Feet />
        <div className="counter-name">{t.name}</div>
        <Dial total={24} states={ticks} current={b.hours + 1} label={`${daysLabel(b.days)} נקיים`}>
          <span className="dial-num">{b.days.toLocaleString('he-IL')}</span>
          <span className="dial-of">{b.days === 1 ? 'יום נקי' : 'ימים נקיים'}</span>
        </Dial>
        <div className="clock" dir="ltr" aria-label="שעות, דקות ושניות">
          {pad(b.hours)}:{pad(b.minutes)}:{pad(b.seconds)}
        </div>
        <div className="counter-since">
          מאז {dateOf(t.since)}, בשעה {timeOf(t.since)}
        </div>
      </section>

      <div className="stats">
        {t.costPerDay ? (
          <div className="card stat">
            <b>{formatMoney(moneySaved(t, ms))}</b>
            <span>נחסכו</span>
          </div>
        ) : (
          <button className="card stat add" onClick={onEdit}>
            <b>+ ₪</b>
            <span>להוסיף עלות יומית</span>
          </button>
        )}
        {t.hoursPerDay ? (
          <div className="card stat">
            <b>{formatHours(hoursSaved(t, ms))}</b>
            <span>של זמן חזרו אליי</span>
          </div>
        ) : (
          <button className="card stat add" onClick={onEdit}>
            <b>+ שעות</b>
            <span>להוסיף זמן ביום</span>
          </button>
        )}
        <div className="card stat">
          <b>{Math.floor(best / DAY_MS).toLocaleString('he-IL')}</b>
          <span>הרצף הארוך ביותר</span>
        </div>
      </div>

      <div className="card">
        {next ? (
          <>
            <p className="card-label">אבן הדרך הבאה</p>
            <div className="next-ms">
              <h2>{next.label}</h2>
              <span className="muted small">עוד {durationLabel(next.remainingMs)}</span>
            </div>
            <div className="bar big" aria-hidden="true">
              <span style={{ width: `${Math.min(100, next.progress * 100)}%` }} />
            </div>
          </>
        ) : (
          <p className="commit-title">כל אבני הדרך הושגו. רק להיום, עוד יום.</p>
        )}
      </div>

      <div className="card">
        <p className="card-label">אבני דרך</p>
        <div className="badges">
          {MILESTONES.map((m) => {
            const got = days >= m.days;
            return (
              <div key={m.days} className={`badge${got ? ' got' : ''}`} title={got ? `הושג ב${formatLong(toISO(new Date(parseLocal(t.since) + m.days * DAY_MS)))}` : undefined}>
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => {
                    const a = ((i * 30 - 90) * Math.PI) / 180;
                    return (
                      <line
                        key={i}
                        x1={32 + 25 * Math.cos(a)}
                        y1={32 + 25 * Math.sin(a)}
                        x2={32 + 30 * Math.cos(a)}
                        y2={32 + 30 * Math.sin(a)}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                  <circle cx="32" cy="32" r="21" />
                </svg>
                <span className="badge-label">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <label className="toggle share-name">
        <span className="small">להציג בתמונת השיתוף ממה מתנקים</span>
        <input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} />
      </label>
      <div className="row actions-row">
        <button className="btn btn-primary" onClick={() => onShare(b.days, withName)}>
          שיתוף תמונה
        </button>
        <button className="btn btn-ghost" onClick={onEdit}>
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
    </>
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
      since: since || nowInputValue(),
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
          <input id="tr-since" type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} />
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
          {durationLabel(ms)} נקיים לא נמחקים. הם נשמרים ברצפים הקודמים, וכל מה שלמדת בהם נשאר איתך. מתחילים שוב, רק
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
            <div key={r.id} className="reason">
              {r.photo && <img src={r.photo} alt="" />}
              {r.text && <p>{r.text}</p>}
              <button
                className="reason-del"
                aria-label="מחיקת הסיבה"
                onClick={() => confirm('למחוק את הסיבה הזו?') && removeReason(r.id)}
              >
                ✕
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
