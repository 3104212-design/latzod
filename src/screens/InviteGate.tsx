// מסך הכניסה למשתמשים חדשים: האפליקציה פתוחה בהזמנה אישית בלבד.
// עם קישור הזמנה: בודקים אותו מול השרת (פעם אחת לכל הזמנה). בלי קישור: מדביקים קישור, או משחזרים גיבוי.
// באייפון בדפדפן: אחרי הכניסה מציעים להתקין קודם, כי לאפליקציה במסך הבית יש אחסון נפרד מ-Safari.

import { useEffect, useRef, useState } from 'react';
import { PublisherLogo, TitleMark } from '../components/Brand';
import { I } from '../components/Icons';
import { Dial, Feet } from '../components/Visuals';
import { RESTORE_MESSAGES, restoreBackupFile } from '../lib/backup';
import { toast } from '../lib/feedback';
import { enterWithInvite, INVITE_ERRORS, parseInvite, resumeLink, type InviteError } from '../lib/invites';
import { replaceRoute } from '../lib/router';
import { setState, useAppState } from '../lib/store';

function GateHero() {
  return (
    <section className="hero onb-hero">
      <Feet />
      <Dial total={60} states={[]} current={0} label="לצעוד לתוך היום">
        <TitleMark height="58%" />
      </Dial>
      <div className="onb-slogan">רק להיום | 24 שעות</div>
    </section>
  );
}

export function InviteGate({ invite }: { invite?: string }) {
  const [checking, setChecking] = useState(!!invite);
  const [error, setError] = useState<InviteError | null>(null);
  const [text, setText] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const enter = async (raw: string) => {
    const p = parseInvite(raw);
    if (!p) {
      setError('invalid');
      return;
    }
    setChecking(true);
    setError(null);
    const r = await enterWithInvite(p.code, p.seat);
    setChecking(false);
    // הקוד לא נשאר בכתובת: רענון לא ינסה לנצל אותו שוב
    replaceRoute('#/');
    if (!r.ok) setError(r.error);
  };

  // גם כשהקישור נפתח בזמן שהמסך כבר פתוח (רק ה-hash משתנה, בלי טעינה מחדש)
  const tried = useRef<string | null>(null);
  useEffect(() => {
    if (invite && tried.current !== invite) {
      tried.current = invite;
      enter(invite);
    }
  }, [invite]);

  return (
    <div className="onb gate">
      <GateHero />
      <div className="onb-body">
        {checking ? (
          <div className="card gate-checking" role="status">
            <span className="spinner" aria-hidden="true" />
            בודקים את ההזמנה…
          </div>
        ) : (
          <>
            <div className="card">
              <p className="gate-title">האפליקציה פתוחה בהזמנה אישית</p>
              <p className="muted small">
                כל הזמנה פותחת את האפליקציה פעם אחת, לאדם אחד. מה שנכתב בה נשמר רק בטלפון שלך, בלי הרשמה ובלי חשבון.
              </p>
              {error && (
                <p className="warn-note" role="alert">
                  {INVITE_ERRORS[error]}
                </p>
              )}
              <form
                className="field gate-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  enter(text);
                }}
              >
                <label htmlFor="gate-link">קישור או קוד הזמנה</label>
                <div className="gate-row">
                  <input
                    id="gate-link"
                    type="text"
                    dir="ltr"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {'clipboard' in navigator && 'readText' in navigator.clipboard && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        try {
                          const t = await navigator.clipboard.readText();
                          setText(t);
                          if (parseInvite(t)) enter(t);
                        } catch {
                          toast('לא הצלחנו להדביק. אפשר להדביק בלחיצה ארוכה על השדה.');
                        }
                      }}
                    >
                      הדבקה
                    </button>
                  )}
                </div>
                <button className="btn btn-primary btn-block" disabled={!text.trim()}>
                  כניסה
                </button>
              </form>
            </div>

            <div className="card gate-restore">
              <span>
                <b>עוברים לטלפון חדש?</b>
                <span className="muted small" style={{ display: 'block' }}>
                  גיבוי מהטלפון הקודם פותח את האפליקציה עם כל מה שנשמר בה.
                </span>
              </span>
              <button className="btn btn-ghost" onClick={() => file.current?.click()}>
                שחזור מגיבוי
              </button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  const r = await restoreBackupFile(f);
                  if (r !== 'cancelled') toast(RESTORE_MESSAGES[r]);
                }}
              />
            </div>
          </>
        )}
        <div style={{ flex: 1 }} />
        <div className="onb-credit">
          <PublisherLogo height={34} />
          <span>
            מבוסס על הספר "לצעוד לתוך היום"
            <br />
            הוצאת ספרים לפרוש כנפיים
          </span>
        </div>
      </div>
    </div>
  );
}

/** באייפון בדפדפן, אחרי כניסה עם הזמנה: להתקין במסך הבית לפני שמתחילים */
export function IosInstallTip() {
  const s = useAppState();
  const a = s.access!;
  const done = () => setState((x) => ({ ...x, access: x.access && { ...x.access, tipDone: true } }));
  return (
    <div className="onb gate">
      <GateHero />
      <div className="onb-body">
        <div className="card">
          <p className="gate-title">
            {I.check({ size: 22 })} ההזמנה התקבלה
          </p>
          <p className="muted small">
            באייפון כדאי להתקין את האפליקציה במסך הבית לפני שמתחילים. לאפליקציה במסך הבית יש מקום שמירה נפרד מהדפדפן, ושם
            היא תהיה זמינה בלחיצה אחת.
          </p>
          <ol className="ios-steps">
            <li>מעתיקים את קישור ההמשך האישי (הכפתור למטה).</li>
            <li>
              ב-Safari: <b>שיתוף</b> ואז <b>הוספה למסך הבית</b>.
            </li>
            <li>פותחים את האפליקציה מהמסך הבית ומדביקים את הקישור.</li>
          </ol>
          <p className="muted small">הקישור אישי: הוא פותח את האפליקציה רק לך, ולא עובד בשביל אחרים.</p>
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(resumeLink(a.code, a.seat));
                toast('קישור ההמשך הועתק');
              } catch {
                toast('לא הצלחנו להעתיק. אפשר להמשיך כאן בדפדפן.');
              }
            }}
          >
            {I.copy({ size: 20 })}
            העתקת קישור ההמשך
          </button>
          <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={done}>
            להמשיך כאן בדפדפן
          </button>
        </div>
      </div>
    </div>
  );
}
