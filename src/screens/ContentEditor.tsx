// מצב עריכת תוכן: הזנת הקריאה, השאלות והתפילה של יום מסוים.
// התוכן נשמר במכשיר, ואפשר לייצא אותו לקובץ ולשלב אותו בגרסה הבאה של האפליקציה.

import { useState } from 'react';
import { getContent, type DayContent } from '../lib/program';
import { setState, useAppState } from '../lib/store';

export function ContentEditor({ contentKey, label }: { contentKey: string; label: string }) {
  const s = useAppState();
  const initial = getContent(contentKey, s.content);
  const [title, setTitle] = useState(initial.title ?? '');
  const [page, setPage] = useState(initial.page != null ? String(initial.page) : '');
  const [reading, setReading] = useState(initial.reading ?? '');
  const [qs, setQs] = useState<string[]>(() => {
    const q = initial.questions ?? [];
    return [q[0] ?? '', q[1] ?? '', q[2] ?? ''];
  });
  const [prayer, setPrayer] = useState(initial.prayer ?? '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    const c: DayContent = {};
    if (title.trim()) c.title = title.trim();
    if (reading.trim()) c.reading = reading.trim();
    const questions = qs.map((q) => q.trim()).filter(Boolean);
    if (questions.length) c.questions = questions;
    if (prayer.trim()) c.prayer = prayer.trim();
    const p = parseInt(page, 10);
    if (Number.isFinite(p) && p > 0) c.page = p;
    setState((st) => {
      const content = { ...st.content };
      if (Object.keys(c).length) content[contentKey] = c;
      else delete content[contentKey];
      return { ...st, content };
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="card" style={{ borderStyle: 'dashed' }}>
      <p className="card-label">עריכת תוכן · {label}</p>
      <p className="muted small">שדה ריק משאיר את ברירת המחדל (שאלות ותפילה של הצעד).</p>
      <div className="field">
        <label htmlFor="ed-title">כותרת הקריאה</label>
        <input id="ed-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ed-page">עמוד בספר</label>
        <input id="ed-page" type="number" inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ed-reading">הקריאה היומית</label>
        <textarea id="ed-reading" style={{ minHeight: 160 }} value={reading} onChange={(e) => setReading(e.target.value)} />
      </div>
      <div className="field">
        <label>שאלון להיום</label>
        {qs.map((q, i) => (
          <input
            key={i}
            className="editor-q"
            type="text"
            placeholder={`שאלה ${i + 1}`}
            value={q}
            onChange={(e) => setQs((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </div>
      <div className="field">
        <label htmlFor="ed-prayer">תפילה להיום</label>
        <textarea id="ed-prayer" value={prayer} onChange={(e) => setPrayer(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-block" onClick={save}>
        {saved ? '✓ נשמר' : 'שמירת התוכן של היום'}
      </button>
    </div>
  );
}
