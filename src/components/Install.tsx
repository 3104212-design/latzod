// התקנת האפליקציה בטלפון: כפתור התקנה (אנדרואיד ומחשב) והוראות לאייפון.

import { useState } from 'react';
import { Sheet } from './Sheet';
import { I } from './Icons';
import { promptInstall, usePwa } from '../lib/pwa';
import { setState, useAppState } from '../lib/store';

function IosSteps() {
  return (
    <ol className="ios-steps">
      <li>
        פותחים את האתר ב-<b>Safari</b>.
      </li>
      <li>
        לוחצים על כפתור השיתוף{' '}
        <svg viewBox="0 0 24 24" aria-label="שיתוף" role="img" className="inline-ico">
          <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 11H5v9h14v-9h-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>{' '}
        בתחתית המסך.
      </li>
      <li>
        בוחרים <b>"הוספה למסך הבית"</b>, ואז <b>"הוסף"</b>.
      </li>
    </ol>
  );
}

/** כרטיס התקנה. banner: הצעה קטנה שאפשר לסגור, במסך "היום" */
export function InstallCard({ banner }: { banner?: boolean }) {
  const pwa = usePwa();
  const s = useAppState();
  const [ios, setIos] = useState(false);

  if (pwa.standalone) {
    return banner ? null : (
      <div className="card install-card">
        <div className="install-ico" aria-hidden="true">
          {I.check()}
        </div>
        <span>
          <b>האפליקציה מותקנת</b>
          <span className="muted small" style={{ display: 'block' }}>
            פותחים אותה מהאייקון של העקבות במסך הבית.
          </span>
        </span>
      </div>
    );
  }
  if (banner && (s.installDismissed || (!pwa.canPrompt && !pwa.ios))) return null;

  const install = async () => {
    if (pwa.canPrompt) await promptInstall();
    else setIos(true);
  };

  return (
    <>
      <div className={`card install-card${banner ? ' banner' : ''}`}>
        <img className="install-icon" src="icons/icon-192.png" alt="" width={48} height={48} />
        <span style={{ flex: 1 }}>
          <b>להתקין כאפליקציה</b>
          <span className="muted small" style={{ display: 'block' }}>
            {pwa.canPrompt || pwa.ios ? 'אייקון במסך הבית, מסך מלא, ועבודה גם בלי אינטרנט.' : 'בדפדפן Chrome בתפריט ⋮ בוחרים "התקנת אפליקציה". באייפון: Safari ← שיתוף ← "הוספה למסך הבית".'}
          </span>
        </span>
        {(pwa.canPrompt || pwa.ios) && (
          <button className="btn btn-primary" onClick={install}>
            התקנה
          </button>
        )}
        {banner && (
          <button className="install-dismiss" aria-label="לא עכשיו" onClick={() => setState((st) => ({ ...st, installDismissed: true }))}>
            {I.close({ size: 18 })}
          </button>
        )}
      </div>
      {ios && (
        <Sheet title="התקנה באייפון" onClose={() => setIos(false)}>
          <div className="card">
            <IosSteps />
          </div>
          <button className="btn btn-primary btn-block" onClick={() => setIos(false)}>
            הבנתי
          </button>
        </Sheet>
      )}
    </>
  );
}
