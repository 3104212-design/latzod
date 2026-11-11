// בדיקת תצוגה אוטומטית. רצה בתוך הדפדפן על המסך הנוכחי:
//   const { audit } = await import('/scripts/qa-audit.js'); audit()
// מחזירה רשימת בעיות: חריגה מהמסך, טקסט חתוך, ניגודיות נמוכה, מטרות לחיצה קטנות, רכיבים בלי שם נגיש.

function visible(el) {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function decorative(el) {
  return !!el.closest('.feet, .sr-only, [aria-hidden="true"], svg, .sheet-backdrop[hidden]');
}

function desc(el) {
  const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '';
  const txt = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  return `${el.tagName.toLowerCase()}${cls}${txt ? ` "${txt}"` : ''}`;
}

function parseColor(c) {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

function lum({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function blend(top, bottom) {
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

/** צבע הרקע בפועל מאחורי אלמנט (מתעלם מתמונות רקע) */
function bgOf(el) {
  const layers = [];
  for (let n = el; n; n = n.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) {
      layers.push(c);
      if (c.a >= 1) break;
    }
  }
  let out = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
  return out;
}

export function audit({ minTap = 40 } = {}) {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  const add = (type, el, extra = '') => issues.push(`${type}: ${el ? desc(el) : ''}${extra ? ' ' + extra : ''}`);

  if (document.documentElement.scrollWidth > vw + 1) add('גלילה אופקית', null, `${document.documentElement.scrollWidth}>${vw}`);

  const all = [...document.querySelectorAll('body *')].filter((el) => visible(el) && !decorative(el));

  for (const el of all) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    // חריגה מרוחב המסך
    if (s.position !== 'fixed' && (r.right > vw + 1 || r.left < -1) && !el.closest('.tracker-tabs, .chips.scroll')) {
      add('חורג מהמסך', el, `[${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    // טקסט חתוך
    const clips = (['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflow)) && !el.querySelector(':scope > .feet');
    if (clips && el.scrollWidth > el.clientWidth + 2 && !s.webkitLineClamp?.match?.(/\d/) && s.textOverflow !== 'ellipsis') {
      add('תוכן חתוך', el, `${el.scrollWidth}>${el.clientWidth}`);
    }
  }

  // ניגודיות טקסט
  const seen = new Set();
  for (const el of all) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const s = getComputedStyle(el);
    const fg = parseColor(s.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const c = blend(fg, bg);
    const l1 = lum(c);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    if (ratio < need && !el.closest('button:disabled, input:disabled, textarea:disabled, .future')) {
      const key = `${s.color}|${desc(el).slice(0, 30)}`;
      if (!seen.has(key)) {
        seen.add(key);
        add('ניגודיות', el, `${ratio.toFixed(2)} (נדרש ${need})`);
      }
    }
  }

  // מטרות לחיצה ושמות נגישים
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="tab"]')) {
    if (!visible(el) || el.closest('[aria-hidden="true"]')) continue;
    const r = el.getBoundingClientRect();
    const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
    if (!inline && el.type !== 'hidden' && (r.height < minTap || r.width < minTap) && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'range') {
      add('מטרת לחיצה קטנה', el, `${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const name =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
      el.closest('label')?.textContent ||
      el.textContent ||
      el.getAttribute('title') ||
      el.getAttribute('placeholder');
    if (!name || !name.trim()) add('אין שם נגיש', el);
  }

  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) add('תמונה בלי alt', img);

  // חלונות צפים: חייבים להיות בתוך המסך, ולהיות העליונים בנקודת המרכז שלהם
  const vh = window.innerHeight;
  for (const sheet of document.querySelectorAll('.sheet, .celebrate-card, .lock-screen')) {
    const r = sheet.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) {
      add('חלון מחוץ למסך', sheet, `[top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}, vh ${vh}]`);
      continue;
    }
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
    const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 40), 1), vh - 1);
    const hit = document.elementFromPoint(x, y);
    if (hit && !sheet.contains(hit)) add('חלון מוסתר מאחורי רכיב אחר', sheet, desc(hit));
  }

  return issues;
}
