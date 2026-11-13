// הפתיחה המונפשת של המסך (styles-v24.css: [data-intro]), פעם אחת בכל פתיחה של האפליקציה.
// מתחילה כשמסך הפתיחה מתחיל להיעלם, כדי שלא תסתיים מאחוריו.

let started = false;

export function startIntro() {
  if (started) return;
  started = true;
  const root = document.documentElement;
  root.dataset.intro = '';
  setTimeout(() => delete root.dataset.intro, 2600);
}
