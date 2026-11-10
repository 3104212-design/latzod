// ממיר את הצילומים של כותרת הכריכה ושל לוגו ההוצאה לקבצי SVG וקטוריים.
//   node scripts/trace-brand.mjs
// הקלט: brand-src/cover-title.jpg, brand-src/publisher-logo.jpg
// הפלט: src/assets/title.svg, src/assets/publisher-logo.svg
import sharp from 'sharp';
import potrace from 'potrace';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const trace = promisify(potrace.trace);

/** חותך, ממיר לשחור-לבן (הצורה בשחור) ומחזיר PNG */
async function mask(file, crop, { light, threshold, erase = [] }) {
  // sharp מריץ את הפעולות בסדר קבוע משלו, ולכן כל שלב נעשה במעבר נפרד
  let buf = await sharp(root(file)).extract(crop).greyscale().png().toBuffer();
  // potrace עוקב אחרי האזורים הכהים. כשהצורה בהירה (טקסט לבן על ירוק) הופכים צבעים
  if (light) buf = await sharp(buf).negate({ alpha: false }).png().toBuffer();
  buf = await sharp(buf).threshold(threshold).png().toBuffer();
  if (erase.length) {
    const rects = erase
      .map((r) => `<rect x="${r.left - crop.left}" y="${r.top - crop.top}" width="${r.width}" height="${r.height}" fill="white"/>`)
      .join('');
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}">${rects}</svg>`);
    buf = await sharp(buf).composite([{ input: svg }]).png().toBuffer();
  }
  return buf;
}

/** מחזיר SVG עם path אחד, צבע currentColor, ו-viewBox צמוד לצורה */
async function toSvg(buf, opts = {}) {
  const raw = await trace(buf, { turdSize: 40, optTolerance: 0.4, threshold: 128, color: 'currentColor', ...opts });
  const d = /<path d="([^"]+)"/.exec(raw)?.[1];
  if (!d) throw new Error('trace failed');
  // מחשבים את גבולות הצורה כדי לחתוך שוליים ריקים
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const pad = 4;
  const minX = Math.floor(Math.min(...xs)) - pad;
  const minY = Math.floor(Math.min(...ys)) - pad;
  const w = Math.ceil(Math.max(...xs)) - minX + pad;
  const h = Math.ceil(Math.max(...ys)) - minY + pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>\n`;
}

await mkdir(root('src/assets'), { recursive: true });
await mkdir(root('brand-src/preview'), { recursive: true });

// כותרת הכריכה: טקסט לבן על רקע ירוק
const titleMask = await mask('brand-src/cover-title.jpg', { left: 330, top: 230, width: 830, height: 1290 }, { light: true, threshold: 70 });
await sharp(titleMask).toFile(root('brand-src/preview/title-mask.png'));
await writeFile(root('src/assets/title.svg'), await toSvg(titleMask));

// לוגו ההוצאה: ירוק על רקע לבן. מוחקים את הטקסט הקטן שליד הסמל
const logoMask = await mask(
  'brand-src/publisher-logo.jpg',
  { left: 380, top: 400, width: 790, height: 800 },
  { light: false, threshold: 138, erase: [{ left: 280, top: 950, width: 265, height: 160 }] },
);
await sharp(logoMask).toFile(root('brand-src/preview/logo-mask.png'));
await writeFile(root('src/assets/publisher-logo.svg'), await toSvg(logoMask));

console.log('brand traced');
