// להזמין מישהו: שליחת הקישור לאפליקציה, העתקה, או קוד QR להראות פנים אל פנים (למשל בפגישה).
// כל מי שפותח את הקישור בטלפון שלו מקבל אפליקציה נקייה ופרטית משלו. שום נתון לא נשלח עם ההזמנה.

import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Sheet } from './Sheet';
import { toast } from '../lib/feedback';

/** הכתובת של האפליקציה עצמה, בלי מסך מסוים (בענן או ב-GitHub Pages, לפי איפה שהיא פתוחה) */
export function appLink(): string {
  return new URL('./', location.href.split('#')[0]).href;
}

/** נוסח ההזמנה: רק על האפליקציה, בלי לחשוף משהו על מי ששולח */
export const INVITE_TEXT =
  '"לצעוד לתוך היום": 12 צעדים, 12 חודשים, רק להיום. ספירת ימים נקיים, קריאה, שאלון ותפילה לכל יום. האפליקציה פרטית לגמרי: הכל נשמר רק בטלפון שלך, בלי הרשמה ובלי חשבון.';

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

export function InviteCard() {
  const [qr, setQr] = useState(false);
  const link = appLink();

  const send = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'לצעוד לתוך היום', text: INVITE_TEXT, url: link });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    // בלי תפריט שיתוף (למשל במחשב): וואטסאפ עם ההודעה מוכנה
    window.open(`https://wa.me/?text=${encodeURIComponent(`${INVITE_TEXT}\n${link}`)}`, '_blank', 'noopener');
  };

  return (
    <section className="card invite">
      <p className="card-label">להזמין מישהו</p>
      <p className="muted small">
        כל מי שמקבל את הקישור ופותח אותו בטלפון שלו מקבל אפליקציה נקייה משלו: ספירה, יומן והגדרות חדשים. שום דבר ממה
        שנשמר אצלך לא נשלח, ואף אחד לא רואה את הנתונים של אחרים.
      </p>
      <button className="btn btn-primary btn-block" onClick={send}>
        שליחת הזמנה
      </button>
      <div className="row invite-row">
        <button
          className="btn btn-ghost"
          onClick={async () => toast((await copyText(link)) ? 'הקישור הועתק' : 'לא הצלחנו להעתיק. אפשר להראות קוד QR.')}
        >
          העתקת הקישור
        </button>
        <button className="btn btn-ghost" onClick={() => setQr(true)}>
          קוד QR
        </button>
      </div>
      {qr && <QrSheet link={link} onClose={() => setQr(false)} />}
    </section>
  );
}

/** קוד QR גדול: סורקים במצלמה של הטלפון, והאפליקציה נפתחת */
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
        <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} role="img" aria-label="קוד QR לקישור של האפליקציה" shapeRendering="crispEdges">
          <rect x="-4" y="-4" width={n + 8} height={n + 8} fill="#fff" />
          <path d={path} fill="#111" />
        </svg>
        <p>מכוונים את המצלמה של הטלפון לקוד, והאפליקציה נפתחת. כל אחד מקבל מערכת נקייה משלו.</p>
        <p className="qr-link" dir="ltr">
          {link}
        </p>
      </div>
    </Sheet>
  );
}
