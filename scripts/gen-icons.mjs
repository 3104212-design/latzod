// יוצר אייקוני PNG מקובץ ה-SVG של העקבות: npm run icons
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const out = (name) => fileURLToPath(new URL(`../public/icons/${name}`, import.meta.url));
const svg = await readFile(out('icon.svg'));

for (const size of [192, 512]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out(`icon-${size}.png`));
}

// אייקון "maskable": רקע מלא בלי פינות מעוגלות
const maskable = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'));
await sharp(maskable, { density: 300 }).resize(512, 512).png().toFile(out('icon-maskable-512.png'));

console.log('icons generated');
