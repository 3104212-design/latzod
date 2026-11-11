// רכיבים שרצים ברקע: חגיגת אבני דרך, "מה חדש", ועדכון צבע סרגל המערכת.

import { useEffect } from 'react';
import { Sheet } from './Sheet';
import { celebrate, toast } from '../lib/feedback';
import { useNow } from '../lib/hooks';
import { renderShareImage, shareImage } from '../lib/shareImage';
import { cleanDaysWord, elapsedMs, milestoneLabel, reachedMilestone } from '../lib/sobriety';
import { setState, useAppState } from '../lib/store';
import { APP_VERSION, releaseOf, WHATS_NEW } from '../lib/version';

/** בודק פעם בדקה אם ספירה הגיעה לאבן דרך חדשה, וחוגג פעם אחת */
export function MilestoneWatcher() {
  const s = useAppState();
  const now = useNow(60000);

  useEffect(() => {
    for (const t of s.trackers) {
      const reached = reachedMilestone(elapsedMs(t.since, now));
      const done = s.celebrated?.[t.id] ?? 0;
      if (reached > done) {
        setState((st) => ({ ...st, celebrated: { ...st.celebrated, [t.id]: reached } }));
        const label = milestoneLabel(reached);
        const named = t.name && t.name !== 'ההתמכרות שלי' ? ` מ${t.name}` : '';
        const show = (blob: Blob | null) =>
          celebrate({
            size: 'big',
            title: `${label} נקיים${named}!`,
            text: 'צעד אחר צעד, יום אחר יום. זה שלך, וזה אמיתי. רק להיום.',
            share: blob
              ? async () => {
                  const r = await shareImage(blob, `${label} נקיים. רק להיום.`);
                  if (r === 'downloaded') toast('התמונה נשמרה במכשיר.');
                }
              : undefined,
          });
        renderShareImage({ days: reached, label: cleanDaysWord(reached), subtitle: label })
          .then(show)
          .catch(() => show(null));
        break; // חגיגה אחת בכל פעם
      }
    }
  }, [s.trackers, s.celebrated, now]);

  return null;
}

/** "מה חדש" אחרי עדכון גרסה */
export function WhatsNew() {
  const s = useAppState();
  if (!s.onboarded || releaseOf(s.seenVersion) === releaseOf(APP_VERSION)) return null;
  const close = () => setState((st) => ({ ...st, seenVersion: APP_VERSION }));
  return (
    <Sheet title={`מה חדש בגרסה ${releaseOf(APP_VERSION)}`} onClose={close}>
      <div className="card">
        <ul className="whats-new">
          {WHATS_NEW.map((w) => (
            <li key={w.title}>
              <b>{w.title}</b>
              <span>{w.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <button className="btn btn-primary btn-block" onClick={close}>
        מעולה, ממשיכים
      </button>
    </Sheet>
  );
}

/** צבע הסרגל העליון של הטלפון לפי מצב התצוגה, וגודל הטקסט */
export function DocumentSync() {
  const s = useAppState();
  useEffect(() => {
    const root = document.documentElement;
    if (s.theme === 'light' || s.theme === 'dark') root.dataset.theme = s.theme;
    else delete root.dataset.theme;
    if (s.textSize && s.textSize !== 'normal') root.dataset.size = s.textSize;
    else delete root.dataset.size;

    const apply = () => {
      const dark = s.theme === 'dark' || (s.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#24622a' : '#4FAE52');
    };
    apply();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [s.theme, s.textSize]);
  return null;
}
