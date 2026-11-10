// עוד: הגדרות המסלול, ספירת ימים נקיים, איש קשר, תוכן, גיבוי ואודות.

import { useRef, useState } from 'react';
import { TopBar } from '../components/Chrome';
import { BookCredit, TitleBadge } from '../components/Brand';
import { todayISO } from '../lib/dates';
import type { DayContent } from '../lib/program';
import { downloadJSON, normalize, readJSONFile, resetAll, setState, useAppState, type AppState } from '../lib/store';

const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

export function MoreScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const backupInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  const importBackup = async (f: File) => {
    try {
      const data = normalize(await readJSONFile(f));
      if (confirm('הגיבוי יחליף את כל הנתונים שבמכשיר עכשיו. להמשיך?')) {
        setState({ ...data, onboarded: true });
        flash('הגיבוי שוחזר');
      }
    } catch {
      flash('לא הצלחנו לקרוא את הקובץ');
    }
  };

  const importContent = async (f: File) => {
    try {
      const raw = (await readJSONFile(f)) as Record<string, DayContent>;
      if (!raw || typeof raw !== 'object') throw new Error('bad');
      const valid = Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^\d{1,2}-\d{1,2}$/.test(k) && v && typeof v === 'object'));
      setState((st) => ({ ...st, content: { ...st.content, ...valid } }));
      flash(`נטען תוכן ל-${Object.keys(valid).length} ימים`);
    } catch {
      flash('לא הצלחנו לקרוא את קובץ התוכן');
    }
  };

  const contentCount = Object.keys(s.content).length;

  return (
    <>
      <TopBar onSos={onSos} />
      <div className="page-head">
        <h1>עוד</h1>
        <p>הגדרות, גיבוי ופרטים על האפליקציה</p>
      </div>
      <div className="stack">
        {msg && (
          <div className="card commit" role="status">
            {msg}
          </div>
        )}

        <section className="card book-card">
          <TitleBadge height={92} />
          <p className="book-card-sub">
            רק להיום | 24 שעות
            <br />
            <span className="muted small">12 צעדים | 12 חודשים | 24 שעות</span>
          </p>
          <BookCredit />
        </section>

        <section className="card">
          <p className="card-label">המסלול שלי</p>
          <label className="choice">
            <input type="radio" name="mode" checked={s.mode === 'calendar'} onChange={() => patch({ mode: 'calendar' })} />
            <span>
              <b>לפי לוח השנה, כמו בספר</b>
              <span className="muted small">ינואר הוא הצעד הראשון ודצמבר הוא השנים עשר. כולם צועדים יחד באותו יום.</span>
            </span>
          </label>
          <label className="choice">
            <input
              type="radio"
              name="mode"
              checked={s.mode === 'personal'}
              onChange={() => patch({ mode: 'personal', startDate: s.startDate ?? todayISO() })}
            />
            <span>
              <b>מסלול אישי מיום ההתחלה</b>
              <span className="muted small">מתחילים מהצעד הראשון בתאריך שבוחרים, וכל צעד נמשך חודש.</span>
            </span>
          </label>
          {s.mode === 'personal' && (
            <div className="field">
              <label htmlFor="start">תאריך ההתחלה</label>
              <input
                id="start"
                type="date"
                value={s.startDate ?? ''}
                onChange={(e) => e.target.value && patch({ startDate: e.target.value })}
              />
            </div>
          )}
        </section>

        <a className="card summary-empty" href="#/clean">
          <span>
            <b>ספירות ימים נקיים</b>
            <span className="muted small" style={{ display: "block" }}>
              {s.trackers.length ? `${s.trackers.length} ספירות פעילות. עריכה, חיסכון ואבני דרך` : "להתחיל ספירה חדשה"}
            </span>
          </span>
          <span aria-hidden="true">‹</span>
        </a>

        <section className="card">
          <p className="card-label">איש קשר לרגעים קשים</p>
          <p className="muted small">יופיע בלחיצה אחת בחלון "עזרה עכשיו".</p>
          <div className="field">
            <label htmlFor="sp-name">שם</label>
            <input id="sp-name" type="text" value={s.sponsorName ?? ''} onChange={(e) => patch({ sponsorName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="sp-phone">טלפון</label>
            <input
              id="sp-phone"
              type="tel"
              dir="ltr"
              value={s.sponsorPhone ?? ''}
              onChange={(e) => patch({ sponsorPhone: e.target.value })}
            />
          </div>
        </section>

        <section className="card">
          <p className="card-label">תצוגה</p>
          {(
            [
              ['auto', 'לפי המכשיר'],
              ['light', 'בהירה'],
              ['dark', 'כהה'],
            ] as const
          ).map(([v, l]) => (
            <label className="choice" key={v}>
              <input type="radio" name="theme" checked={(s.theme ?? 'auto') === v} onChange={() => patch({ theme: v })} />
              <b>{l}</b>
            </label>
          ))}
        </section>

        <section className="card">
          <p className="card-label">תוכן הקריאות</p>
          <label className="toggle">
            <span>
              <b>מצב עריכת תוכן</b>
              <span className="muted small" style={{ display: 'block' }}>
                מוסיף בכל יום טופס להזנת הקריאה, השאלות והתפילה.
              </span>
            </span>
            <input type="checkbox" checked={s.editorMode} onChange={(e) => patch({ editorMode: e.target.checked })} />
          </label>
          {(s.editorMode || contentCount > 0) && (
            <>
              <p className="muted small" style={{ marginTop: 12 }}>
                יש תוכן שהוזן ל-{contentCount} ימים.
              </p>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => downloadJSON('latzod-content.json', s.content)}>
                  ייצוא התוכן
                </button>
                <button className="btn btn-ghost" onClick={() => contentInput.current?.click()}>
                  טעינת קובץ תוכן
                </button>
              </div>
              <input
                ref={contentInput}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importContent(f);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </section>

        <section className="card">
          <p className="card-label">גיבוי</p>
          <p className="muted small">הנתונים נשמרים רק במכשיר הזה. כדאי לשמור גיבוי מדי פעם, למשל לפני החלפת טלפון.</p>
          <div className="row">
            <button className="btn btn-ghost" onClick={() => downloadJSON(`latzod-backup-${todayISO()}.json`, s)}>
              שמירת גיבוי לקובץ
            </button>
            <button className="btn btn-ghost" onClick={() => backupInput.current?.click()}>
              שחזור מגיבוי
            </button>
          </div>
          <input
            ref={backupInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = '';
            }}
          />
        </section>

        <section className="card">
          <p className="card-label">אודות</p>
          <p>
            <b>לצעוד לתוך היום</b> מלווה את הספר "לצעוד לתוך היום": שנים עשר צעדים מחולקים לשנים עשר חודשים, ובכל יום
            קריאה, שאלון ותפילה.
          </p>
          <p className="muted small">
            האפליקציה היא כלי עזר אישי. היא לא מחליפה קבוצה, ספונסר או טיפול מקצועי.
          </p>
        </section>

        <button
          className="btn btn-danger btn-block"
          onClick={() => {
            if (confirm('כל הנתונים במכשיר יימחקו לצמיתות: היומן, ההתחייבויות וההגדרות. אי אפשר לבטל את זה.\n\nלמחוק?')) {
              resetAll();
              location.hash = '#/';
            }
          }}
        >
          מחיקת כל הנתונים
        </button>
      </div>
    </>
  );
}
