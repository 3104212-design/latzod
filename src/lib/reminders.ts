// תזכורות: קובץ יומן (iCalendar) עם שני אירועים יומיים, בוקר וערב, כל אחד עם התראה.
// אין לאפליקציה שרת ששולח התראות, ולכן התזכורת נכנסת ליומן של הטלפון.

const pad = (n: number) => String(n).padStart(2, '0');

/** מקפל שורות ארוכות לפי תקן iCalendar (75 בתים לשורה) */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function stamp(d: Date, utc = false) {
  if (utc) return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function event(kind: string, time: string, title: string, body: string, url: string) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date();
  start.setHours(h || 0, m || 0, 0, 0);
  return [
    'BEGIN:VEVENT',
    `UID:latzod-${kind}-${Date.now()}@latzod`,
    `DTSTAMP:${stamp(new Date(), true)}`,
    `DTSTART:${stamp(start)}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(url ? `${body}\n${url}` : body)}`,
    ...(url ? [`URL:${url}`] : []),
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
  ];
}

export function buildReminders(morning: string, evening: string, url = location.href.split('#')[0]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//latzod//step-into-the-day//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...event('morning', morning, 'רק להיום · ההתחייבות של הבוקר', 'עוד 24 שעות מתחילות. לפתוח את "לצעוד לתוך היום" ולהתחייב להיום.', url),
    ...event('evening', evening, 'סיכום היום · לצעוד לתוך היום', 'דקה לסיכום היום: איך זה הלך, מה הפעיל, ועל מה להודות.', url),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadReminders(morning: string, evening: string) {
  const blob = new Blob([buildReminders(morning, evening)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'latzod-reminders.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- אייפון: קבצים מוכנים בשרת ----------
// באייפון, הורדת קובץ מתוך האפליקציה לא פותחת את היומן. במקום זה פותחים ב-Safari קובץ מוכן מהשרת,
// ו-Safari מציע "הוספה ליומן". הקבצים נוצרים בזמן הבנייה, בחצאי שעות.

function halfHours(from: number, to: number): string[] {
  const out: string[] = [];
  for (let h = from; h <= to; h += 0.5) out.push(`${pad(Math.floor(h))}:${h % 1 ? '30' : '00'}`);
  return out;
}

export const MORNING_SLOTS = halfHours(5, 11.5);
export const EVENING_SLOTS = halfHours(17, 23.5);

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function nearest(t: string, slots: string[]): string {
  return slots.reduce((best, s) => (Math.abs(mins(s) - mins(t)) < Math.abs(mins(best) - mins(t)) ? s : best), slots[0]);
}

export const slotFile = (m: string, e: string) => `reminders/m${m.replace(':', '')}-e${e.replace(':', '')}.ics`;

/** הקובץ המוכן שהכי קרוב לשעות שנבחרו */
export function reminderSlot(morning: string, evening: string) {
  const m = nearest(morning, MORNING_SLOTS);
  const e = nearest(evening, EVENING_SLOTS);
  return { morning: m, evening: e, path: slotFile(m, e) };
}
