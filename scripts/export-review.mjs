// יוצר דף HTML קריא לבדיקת הטיוטות.
//   node scripts/export-review.mjs       כל החודשים שיש להם טיוטות, בדף אחד עם תפריט חודשים
//   node scripts/export-review.mjs 11    חודש אחד (צעד 11)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STEPS, HEBREW_MONTHS } from '../src/content/steps.ts';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paras = (s) => s.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');

async function loadStep(n) {
  try {
    const data = JSON.parse(await readFile(root(`src/content/drafts/step-${n}.json`), 'utf8'));
    return Object.entries(data)
      .map(([k, v]) => ({ day: Number(k.split('-')[1]), ...v }))
      .sort((a, b) => a.day - b.day);
  } catch {
    return [];
  }
}

const arg = process.argv[2];
const files = await readdir(root('src/content/drafts'));
const available = files
  .map((f) => Number(/^step-(\d+)\.json$/.exec(f)?.[1]))
  .filter(Boolean)
  .sort((a, b) => a - b);
const stepNos = arg ? [Number(arg)] : available;

const sections = [];
let total = 0;
for (const n of stepNos) {
  const step = STEPS[n - 1];
  const days = await loadStep(n);
  if (!days.length) continue;
  total += days.length;
  const month = HEBREW_MONTHS[n - 1];
  sections.push(`<article id="step-${n}">
<header>
  <div>${esc(month)} · ${esc(step.principle)}</div>
  <h1>${esc(step.name)}</h1>
  <div class="text">${esc(step.text)}</div>
  <div class="motto">${esc(step.motto)}</div>
  <div>${esc(step.intro)}</div>
</header>
${days
  .map(
    (d) => `<section>
  <div class="date">${d.day} ב${esc(month)} · יום ${d.day}</div>
  <h2>${esc(d.title)}</h2>
  ${paras(d.reading)}
  <div class="q"><h3>שאלון להיום</h3><ul>${d.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>
  <div class="p"><h3>תפילה להיום</h3><p>${esc(d.prayer)}</p></div>
</section>`,
  )
  .join('\n')}
</article>`);
}

if (!sections.length) {
  console.error('לא נמצאו טיוטות');
  process.exit(1);
}

const nav =
  stepNos.length > 1
    ? `<nav>${stepNos.map((n) => `<a href="#step-${n}">${HEBREW_MONTHS[n - 1]}</a>`).join('')}</nav>`
    : '';

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>לצעוד לתוך היום: טיוטות לבדיקה</title>
<style>
  :root { --green:#3f9d43; --deep:#2b7a30; --soft:#e3f1e1; --bg:#f3f6f1; --text:#1b2a1d; --muted:#5e6e60; --line:#dbe4d8; }
  @media (prefers-color-scheme: dark) { :root { --green:#2c7032; --deep:#8fd391; --soft:#1d3320; --bg:#0d140f; --text:#e4eee4; --muted:#9bb09d; --line:#273829; } }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin:0; background:var(--bg); color:var(--text); font-family: Heebo, 'Segoe UI', Arial, sans-serif; line-height:1.7; font-size:17px; }
  main { max-width: 680px; margin: 0 auto; padding: 16px 16px 64px; }
  nav { position: sticky; top: 0; z-index: 2; background: var(--bg); display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
  nav a { flex: none; text-decoration: none; color: var(--deep); background: var(--soft); border-radius: 999px; padding: 4px 12px; font-size: 14px; font-weight: 600; }
  article { margin-bottom: 40px; scroll-margin-top: 64px; }
  header { background: var(--green); color:#fff; border-radius: 20px; padding: 24px 20px; margin-bottom: 8px; }
  header h1 { margin: 0 0 6px; font-size: 30px; }
  header .text { font-size: 18px; margin: 8px 0; }
  header .motto { font-weight: 700; font-size: 20px; margin: 12px 0 4px; }
  .note { background: var(--soft); color: var(--deep); border: 1px dashed var(--green); border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; font-size: 15px; }
  section { border-top: 1px solid var(--line); padding: 22px 0; }
  .date { color: var(--deep); font-weight: 700; font-size: 14px; }
  h2 { margin: 2px 0 10px; font-size: 23px; }
  .q { background: color-mix(in srgb, var(--line) 45%, transparent); border-radius: 12px; padding: 12px 16px; margin: 14px 0; }
  .q h3, .p h3 { margin: 0 0 6px; font-size: 15px; color: var(--deep); }
  .q ul { margin: 0; padding-inline-start: 20px; }
  .p p { margin: 0; font-weight: 600; color: var(--deep); }
</style>
</head>
<body>
<main>
${nav}
<div class="note">טיוטה לבדיקה: כל הטקסטים כאן נכתבו במקור עבור האפליקציה, כתוכן זמני עד שיתקבל קובץ הספר. ${total} ימים.</div>
${sections.join('\n')}
</main>
</body>
</html>
`;

await mkdir(root('review'), { recursive: true });
const out = root(arg ? `review/step-${arg}-draft.html` : 'review/drafts-all.html');
await writeFile(out, html, 'utf8');
console.log(`נוצר: ${out} (${total} ימים)`);
