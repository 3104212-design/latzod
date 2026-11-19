// רשת ביטחון (2.8.1): אם מסך נופל (נתון לא צפוי, באג), מציגים הודעה רגועה במקום מסך לבן,
// עם דרך לחזור, לנסות שוב, ולשמור גיבוי של הנתונים כמו שהם (ישר מהאחסון, בלי לעבור דרך הקוד שנפל).
// סביב כל מסך (ה-key של <main> לפי המסלול: מעבר מסך מאפס אותה), סביב "עזרה עכשיו", וסביב כל האפליקציה.

import { Component, type ReactNode } from 'react';
import { saveFile } from '../lib/files';
import { STORAGE_KEY } from '../lib/store';

/** גיבוי של מה שבאחסון, בלי מפתח המנהל. באייפון נפתח תפריט השיתוף, ולכן רק מתוך לחיצה */
function saveRawBackup() {
  let raw = '{}';
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') {
      delete o.admin;
      raw = JSON.stringify(o, null, 2);
    }
  } catch {
    /* שומרים את מה שיש, גם אם הוא לא JSON תקין */
  }
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  saveFile(new Blob([raw], { type: 'application/json' }), `latzod-backup-${day}.json`).catch(() => undefined);
}

export class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('screen error', error);
    // אם כל האפליקציה נפלה לפני שמסך הפתיחה הוסר, הוא היה מסתיר את ההודעה
    if (this.props.full) document.getElementById('splash')?.remove();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={`oops${this.props.full ? ' oops-full' : ''}`} role="alert">
        <div className="card oops-card">
          <h1>משהו השתבש בתצוגה</h1>
          <p>הנתונים שלי שמורים בטלפון, ושום דבר לא נמחק. אפשר לחזור למסך היום, או לנסות שוב.</p>
          <div className="oops-actions">
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                location.hash = '#/';
                this.setState({ error: null });
              }}
            >
              חזרה למסך היום
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => location.reload()}>
              לנסות שוב
            </button>
            <button className="btn btn-ghost btn-block" onClick={saveRawBackup}>
              שמירת גיבוי של הנתונים
            </button>
          </div>
          <p className="muted small">אם זה חוזר, כדאי לשמור גיבוי ולספר למי ששלח לי את ההזמנה מה קרה לפני כן.</p>
        </div>
      </div>
    );
  }
}
