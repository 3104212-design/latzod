// עוד: הספר והאפליקציה, התקנה, הזמנת משתתפים, תזכורות, המסלול, איש קשר, תצוגה, נעילה, תוכן וגיבוי.

import { useRef } from 'react';
import { InstallCard } from '../components/Install';
import { InviteCard } from '../components/Invite';
import { LockSettings } from '../components/Lock';
import { RemindersCard, TextSizePicker } from '../components/Reminders';
import { toast } from '../lib/feedback';
import { APP_VERSION, PREVIOUS_RELEASE } from '../lib/version';
import { daysLabel } from '../lib/sobriety';
import { TopBar } from '../components/Chrome';
import { BookCredit, TitleBadge } from '../components/Brand';
import { todayISO } from '../lib/dates';
import type { DayContent } from '../lib/program';
import { downloadJSON, normalize, readJSONFile, resetAll, setState, useAppState, type AppState } from '../lib/store';

const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

/** קובץ שנראה כמו גיבוי של האפליקציה (ולא קובץ תוכן או JSON אחר) */
function isBackup(raw: unknown): raw is Partial<AppState> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return (o.days != null && typeof o.days === 'object') || Array.isArray(o.trackers) || typeof o.onboarded === 'boolean';
}

export function MoreScreen({ onSos }: { onSos: () => void }) {
  const s = useAppState();
  const backupInput = useRef<HTMLInputElement>(null);
  const contentInput = useRef<HTMLInputElement>(null);
  const flash = (m: string) => toast(m);

  const importBackup = async (f: File) => {
    let raw: unknown;
    try {
      raw = await readJSONFile(f);
    } catch {
      flash('לא הצלחנו לקרוא את הקובץ');
      return;
    }
    // קובץ אחר (למשל קובץ התוכן) היה מוחק את כל הנתונים. מקבלים רק גיבוי של האפליקציה
    if (!isBackup(raw)) {
      flash('הקובץ הזה אינו גיבוי של האפליקציה');
      return;
    }
    const data = normalize(raw);
    const days = Object.keys(data.days).length;
    const counters = data.trackers.length;
    const what = `בגיבוי: ${daysLabel(days)} ביומן${counters ? `, ${counters === 1 ? 'ספירה אחת' : `${counters} ספירות`}` : ''}.`;
    if (confirm(`${what}\n\nהגיבוי יחליף את כל הנתונים שבמכשיר עכשיו. להמשיך?`)) {
      setState({ ...data, onboarded: true });
      flash('הגיבוי שוחזר');
    }
  };

  const saveBackup = async () => {
    const r = await downloadJSON(`latzod-backup-${todayISO()}.json`, s);
    if (r !== 'cancelled') flash(r === 'shared' ? 'הגיבוי מוכן. כדאי לשמור אותו ב"קבצים" או בענן.' : 'הגיבוי נשמר בתיקיית ההורדות.');
  };

  const importContent = async (f: File) => {
    try {
      const raw = (await readJSONFile(f)) as Record<string, DayContent>;
      if (!raw || typeof raw !== 'object') throw new Error('bad');
      const valid = Object.fromEntries(Object.entries(raw).filter(([k, v]) => /^\d{1,2}-\d{1,2}$/.test(k) && v && typeof v === 'object'));
      if (!Object.keys(valid).length) {
        flash(isBackup(raw) ? 'זה קובץ גיבוי. משחזרים אותו בכפתור "שחזור מגיבוי".' : 'בקובץ הזה אין תוכן של קריאות');
        return;
      }
      setState((st) => ({ ...st, content: { ...st.content, ...valid } }));
      flash(`נטען תוכן ל-${daysLabel(Object.keys(valid).length)}`);
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
        {/* הספר והאפליקציה בכרטיס אחד (במקום כרטיס "אודות" נפרד שחזר על אותו מידע) */}
        <section className="card book-card">
          <TitleBadge height={92} />
          <p className="book-card-sub">
            רק להיום | 24 שעות
            <br />
            <span className="muted small">12 צעדים | 12 חודשים | 24 שעות</span>
          </p>
          <BookCredit />
          <p className="muted small about-note">
            האפליקציה מלווה את הספר ואינה מחליפה קבוצה, ספונסר או טיפול מקצועי.
          </p>
          <div className="row about-row">
            <span className="pill">גרסה {APP_VERSION}</span>
            <button className="btn btn-ghost" onClick={() => setState((st) => ({ ...st, seenVersion: PREVIOUS_RELEASE }))}>
              מה חדש
            </button>
          </div>
        </section>

        <InstallCard />

        <InviteCard />

        <RemindersCard />

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

        <section className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="my-name" className="card-label">איך לקרוא לך? (לא חובה)</label>
            <p className="muted small">השם יופיע בברכה במסך היום. נשמר רק במכשיר הזה.</p>
            <input id="my-name" type="text" autoComplete="given-name" maxLength={24} value={s.name ?? ''} onChange={(e) => patch({ name: e.target.value })} />
          </div>
        </section>

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
          <TextSizePicker />
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

        <LockSettings />

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
                יש תוכן שהוזן ל-{daysLabel(contentCount)}.
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
            <button className="btn btn-ghost" onClick={saveBackup}>
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
