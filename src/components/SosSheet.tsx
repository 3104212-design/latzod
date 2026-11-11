// חלון "עזרה עכשיו": לרגעים קשים, דחף או משבר.

import { useState } from 'react';
import { ChipPicker, Sheet } from './Sheet';
import { Scale } from './Scale';
import { TRIGGERS } from '../lib/sobriety';
import { logCraving, useAppState } from '../lib/store';

export function SosSheet({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const [intensity, setIntensity] = useState(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [logged, setLogged] = useState(false);

  return (
    <Sheet title="רגע. אפשר לעצור." onClose={onClose}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="breath" aria-hidden="true" />
        <p>נושמים לאט עם העיגול: שאיפה כשהוא גדל, נשיפה כשהוא קטן.</p>
      </div>

      <div className="card commit">
        <div className="commit-title">רק להיום</div>
        <p>לא צריך להחליט עכשיו על כל החיים, רק על השעה הקרובה. הדחף יעבור, גם אם עכשיו זה לא מרגיש ככה.</p>
      </div>

      {s.reasons.length > 0 && (
        <div className="card">
          <p className="card-label">למה בחרתי בדרך הזו</p>
          <div className="reasons">
            {s.reasons.map((r) => (
              <div key={r.id} className="reason">
                {r.photo && <img src={r.photo} alt="" />}
                {r.text && <p>{r.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {s.sponsorPhone ? (
        <a className="card call" href={`tel:${s.sponsorPhone.replace(/[^\d+]/g, '')}`}>
          <span>
            <span className="card-label">להתקשר עכשיו</span>
            <br />
            {s.sponsorName || 'הספונסר שלי'}
          </span>
          <b>{s.sponsorPhone}</b>
        </a>
      ) : (
        <div className="card">
          <p className="muted small">
            אפשר לשמור מספר של ספונסר או של חבר בדרך בלשונית "עוד", והוא יופיע כאן בלחיצה אחת.
          </p>
        </div>
      )}

      <div className="card">
        <p className="card-label">לרשום את הדחף</p>
        {logged ? (
          <p>נרשם. עצם הרישום כבר יוצר מרווח. הדחף יעבור.</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="sos-int">
                עוצמה: <b>{intensity}</b>/10
              </label>
              <Scale id="sos-int" min={1} max={10} value={intensity} onChange={setIntensity} low="חלש" high="חזק מאוד" />
            </div>
            <div className="field">
              <label>מה הפעיל אותו?</label>
              <ChipPicker options={TRIGGERS} value={triggers} onChange={setTriggers} />
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => {
                logCraving({ intensity, triggers });
                setLogged(true);
              }}
            >
              רישום
            </button>
          </>
        )}
      </div>

      <a className="card call" href="tel:1201">
        <span>
          <span className="card-label">ער"ן</span>
          <br />
          עזרה ראשונה נפשית, בכל שעה
        </span>
        <b>1201</b>
      </a>

      <a className="card call" href="tel:101">
        <span>
          <span className="card-label">מד"א</span>
          <br />
          במצב חירום רפואי
        </span>
        <b>101</b>
      </a>

      <div className="card">
        <p className="card-label">תפילת השלווה</p>
        <p className="prayer">
          אלוהים, תן בנו שלווה לקבל את מה שאיננו יכולים לשנות, אומץ לשנות את מה שאנו יכולים, ותבונה להבחין בין השניים.
        </p>
      </div>

      <div className="card">
        <p className="card-label">עוד דברים שעוזרים</p>
        <ul style={{ margin: 0, paddingInlineStart: 20 }}>
          <li>להתקשר למישהו מהקבוצה, גם רק כדי לומר שקשה</li>
          <li>ללכת לפגישה, או להצטרף לפגישה מקוונת</li>
          <li>לשתות מים, לאכול משהו, לצאת להליכה קצרה</li>
          <li>לכתוב ביומן מה עובר עליי עכשיו</li>
        </ul>
      </div>
    </Sheet>
  );
}
