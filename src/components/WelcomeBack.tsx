// "טוב שחזרת": כרטיס חם למי שחוזר אחרי כמה ימים. בלי אשמה ובלי השלמות, רק להתחיל מהיום.
// (בלי כפתור משלו: כפתור הצעידה נמצא ממש מעליו, בראש המסך)

import { daysLabel } from '../lib/sobriety';
import { I } from './Icons';
import { useAppState } from '../lib/store';
import { dismissWelcome, useWelcomeGap } from '../lib/visits';

export function WelcomeBack() {
  const gap = useWelcomeGap();
  const s = useAppState();
  if (!gap) return null;
  const name = s.name?.trim();
  return (
    <div className="card welcome-back" role="status">
      <div className="welcome-head">
        <p className="card-label">טוב שחזרת{name ? `, ${name}` : ''}</p>
        <button className="close-btn" onClick={dismissWelcome} aria-label="סגירה">
          {I.close()}
        </button>
      </div>
      <p>
        עברו {daysLabel(gap)} מאז הפעם הקודמת, וזה בסדר. לא צריך להשלים שום דבר. מתחילים מהיום, מהצעד הראשון שלו.
      </p>
    </div>
  );
}
