// הזמנות חד פעמיות (רק בטלפון של המנהל): שליחה, העתקה או קוד QR, ורשימת ההזמנות עם מצב וביטול.
// הזמנה אחת תמיד מוכנה מראש, כדי שתפריט השיתוף ייפתח ישר מהלחיצה (אייפון דורש זאת).
// כל הזמנה פותחת את האפליקציה פעם אחת, לאדם אחד. שום נתון מתוך האפליקציה לא נשלח עם ההזמנה.

import { useCallback, useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { I } from './Icons';
import { Sheet } from './Sheet';
import { formatShort, toISO } from '../lib/dates';
import { toast } from '../lib/feedback';
import {
  createInvite,
  INVITE_ERRORS,
  inviteLink,
  leaveAdmin,
  listInvites,
  markGiven,
  pairAdmin,
  revokeInvite,
  type Invite,
} from '../lib/invites';
import { setState, useAppState } from '../lib/store';

/** נוסח ההזמנה: רק על האפליקציה, בלי לחשוף משהו על מי ששולח */
export const INVITE_TEXT =
  '"לצעוד לתוך היום": 12 צעדים, 12 חודשים, רק להיום. ספירת ימים נקיים, קריאה, שאלון ותפילה לכל יום. ההזמנה אישית ופותחת את האפליקציה פעם אחת. הכל נשמר רק בטלפון שלך, בלי הרשמה ובלי חשבון.';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // דפדפנים בלי גישה ללוח: העתקה דרך שדה זמני
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

const dateOf = (iso?: string) => (iso ? formatShort(toISO(new Date(iso))) : '');

/** כרטיס ההזמנות במסך "עוד". מוצג רק במצב מנהל */
export function InviteAdminCard() {
  const s = useAppState();
  const ready = s.admin?.ready;
  const [note, setNote] = useState('');
  const [preparing, setPreparing] = useState(false);
  const [list, setList] = useState<Invite[] | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await listInvites();
    if (r.ok) setList(r.data.invites);
    else if (r.error === 'not-admin') {
      toast(INVITE_ERRORS['not-admin']);
      leaveAdmin();
    }
  }, []);

  /** מכינים את ההזמנה הבאה ברקע */
  const prepare = useCallback(async () => {
    setPreparing(true);
    const r = await createInvite();
    setPreparing(false);
    if (r.ok) setState((x) => ({ ...x, admin: x.admin && { ...x.admin, ready: r.data.code } }));
    else if (r.error !== 'network') toast(INVITE_ERRORS[r.error]);
  }, []);

  useEffect(() => {
    refresh();
    if (!ready) prepare();
  }, []);

  /** ההזמנה המוכנה יצאה לדרך: נרשמת בשרת כ"נשלחה", ומכינים חדשה */
  const given = (code: string) => {
    setState((x) => ({ ...x, admin: x.admin && { ...x.admin, ready: undefined } }));
    const n = note.trim() || undefined;
    setNote('');
    markGiven(code, n).then(refresh);
    prepare();
  };

  const send = async () => {
    if (!ready) return;
    const link = inviteLink(ready);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'לצעוד לתוך היום', text: INVITE_TEXT, url: link });
        given(ready);
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    // בלי תפריט שיתוף (למשל במחשב): וואטסאפ עם ההודעה מוכנה
    window.open(`https://wa.me/?text=${encodeURIComponent(`${INVITE_TEXT}\n${link}`)}`, '_blank', 'noopener');
    given(ready);
  };

  const copy = async () => {
    if (!ready) return;
    if (await copyText(inviteLink(ready))) {
      toast('הקישור הועתק. הוא עובד פעם אחת.');
      given(ready);
    } else toast('לא הצלחנו להעתיק. אפשר להראות קוד QR.');
  };

  const sent = (list ?? []).filter((x) => x.code !== ready && (x.givenAt || x.usedAt || x.revoked));
  const busy = !ready;

  return (
    <section className="card invite">
      <p className="card-label">הזמנה חדשה</p>
      <p className="muted small">כל הזמנה עובדת פעם אחת, לאדם אחד. מי שמקבל אותה מקבל אפליקציה נקייה ופרטית משלו.</p>
      <div className="field">
        <label htmlFor="inv-note">למי ההזמנה? (לא חובה, רק בשבילך)</label>
        <input id="inv-note" type="text" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-block" disabled={busy} onClick={send}>
        {I.share({ size: 20 })}
        {busy ? (preparing ? 'מכינים הזמנה…' : 'אין חיבור לשרת') : 'שליחת הזמנה'}
      </button>
      <div className="row invite-row">
        <button className="btn btn-ghost" disabled={busy} onClick={copy}>
          {I.copy({ size: 20 })}
          העתקה
        </button>
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => {
            if (!ready) return;
            setQr(inviteLink(ready));
            given(ready);
          }}
        >
          {I.qr({ size: 20 })}
          קוד QR
        </button>
      </div>
      {busy && !preparing && (
        <button className="btn btn-ghost btn-block" style={{ marginTop: 10 }} onClick={prepare}>
          לנסות שוב
        </button>
      )}

      {sent.length > 0 && (
        <>
          <p className="card-label invite-list-title">ההזמנות ששלחת</p>
          <ul className="invite-list">
            {sent.map((x) => (
              <li key={x.code}>
                <span className="invite-who">
                  <b>{x.note || 'הזמנה'}</b>
                  <span className="muted small">נשלחה {dateOf(x.givenAt ?? x.created)}</span>
                </span>
                {x.usedAt ? (
                  <span className="pill ok">נפתחה {dateOf(x.usedAt)}</span>
                ) : x.revoked ? (
                  <span className="pill">בוטלה</span>
                ) : (
                  <span className="invite-pending">
                    <span className="pill">ממתינה</span>
                    <button
                      className="btn-link"
                      onClick={async () => {
                        if (!confirm('לבטל את ההזמנה? הקישור יפסיק לעבוד.')) return;
                        const r = await revokeInvite(x.code);
                        if (!r.ok) toast(INVITE_ERRORS[r.error]);
                        refresh();
                      }}
                    >
                      ביטול
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        className="btn-link invite-leave"
        onClick={() => confirm('לצאת ממצב מנהל במכשיר הזה? כדי לחזור צריך קוד ניהול חדש.') && leaveAdmin()}
      >
        יציאה ממצב מנהל
      </button>
      {qr && <QrSheet link={qr} onClose={() => setQr(null)} />}
    </section>
  );
}

/** קוד QR גדול: סורקים במצלמה של הטלפון, והאפליקציה נפתחת. גם הוא חד פעמי */
function QrSheet({ link, onClose }: { link: string; onClose: () => void }) {
  const { n, path } = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(link);
    q.make();
    const count = q.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) for (let c = 0; c < count; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { n: count, path: d };
  }, [link]);

  return (
    <Sheet title="קוד להזמנה" onClose={onClose}>
      <div className="card qr-card">
        {/* שחור על לבן גם במצב כהה, עם שוליים, כדי שכל מצלמה תזהה */}
        <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} role="img" aria-label="קוד QR להזמנה" shapeRendering="crispEdges">
          <rect x="-4" y="-4" width={n + 8} height={n + 8} fill="#fff" />
          <path d={path} fill="#111" />
        </svg>
        <p>מכוונים את המצלמה של הטלפון לקוד, והאפליקציה נפתחת. הקוד עובד פעם אחת, לאדם אחד.</p>
      </div>
    </Sheet>
  );
}

/** כניסה למצב מנהל עם קוד ניהול חד פעמי (נפתח בחמש לחיצות על מספר הגרסה) */
export function AdminPairSheet({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Sheet title="כניסת מנהל" onClose={onClose}>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          const r = await pairAdmin(code);
          setBusy(false);
          if (r.ok) {
            toast('מצב מנהל פעיל. אפשר ליצור הזמנות במסך "עוד".');
            onClose();
          } else setErr(INVITE_ERRORS[r.error]);
        }}
      >
        <p className="muted small">קוד הניהול עובד פעם אחת, ומחבר את הטלפון הזה ליצירת הזמנות.</p>
        {err && (
          <p className="warn-note" role="alert">
            {err}
          </p>
        )}
        <div className="field">
          <label htmlFor="pair-code">קוד ניהול</label>
          <input
            id="pair-code"
            type="text"
            dir="ltr"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || code.trim().length < 8}>
          {busy ? 'מתחברים…' : 'חיבור'}
        </button>
      </form>
    </Sheet>
  );
}
