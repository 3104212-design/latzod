import { saveFile } from './files';

// תמונת שיתוף: מספר הימים הנקיים על רקע ירוק, עם עקבות וטבעת סימונים כמו בכריכה.

const W = 1080;
const H = 1350;

function footprint(g: CanvasRenderingContext2D, x: number, y: number, scale: number, rot: number, alpha: number, flip = false) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(flip ? -scale : scale, scale);
  g.globalAlpha = alpha;
  g.fillStyle = '#ffffff';
  g.fill(new Path2D('M60 0C96 0 118 30 118 74c0 38-14 64-18 86H20C16 138 2 112 2 74 2 30 24 0 60 0Z'));
  g.beginPath();
  if (typeof g.roundRect === 'function') g.roundRect(18, 174, 84, 66, 26);
  else g.ellipse(60, 207, 42, 33, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export async function renderShareImage(opts: { days: number; label: string; subtitle?: string }): Promise<Blob> {
  await Promise.all([
    document.fonts.load('400 220px "Secular One"'),
    document.fonts.load('700 48px "Heebo Variable"'),
  ]).catch(() => {});

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  // רקע
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#5bb65e');
  grad.addColorStop(1, '#46a24a');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  footprint(g, -40, -30, 2.2, -0.25, 0.1);
  footprint(g, 820, 980, 2, 0.2, 0.1, true);

  // טבעת סימונים
  const cx = W / 2;
  const cy = 560;
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const long = i % 5 === 0;
    const r1 = long ? 300 : 315;
    g.strokeStyle = 'rgba(255,255,255,' + (long ? 0.9 : 0.45) + ')';
    g.lineWidth = long ? 10 : 6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
    g.lineTo(cx + 345 * Math.cos(a), cy + 345 * Math.sin(a));
    g.stroke();
  }

  g.direction = 'rtl';
  g.textAlign = 'center';
  g.fillStyle = '#ffffff';

  const num = opts.days.toLocaleString('he-IL');
  g.font = `400 ${num.length > 4 ? 170 : 230}px "Secular One", sans-serif`;
  g.textBaseline = 'middle';
  g.fillText(num, cx, cy - 10);

  g.font = '700 54px "Heebo Variable", sans-serif';
  g.fillText(opts.label, cx, cy + 150);

  if (opts.subtitle) {
    g.font = '500 40px "Heebo Variable", sans-serif';
    g.globalAlpha = 0.9;
    g.fillText(opts.subtitle, cx, 1000);
    g.globalAlpha = 1;
  }

  g.font = '400 64px "Secular One", sans-serif';
  g.fillText('רק להיום', cx, 1110);

  g.font = '600 38px "Heebo Variable", sans-serif';
  g.globalAlpha = 0.85;
  g.fillText('לצעוד לתוך היום', cx, 1260);
  g.globalAlpha = 1;

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
}

/** משתף את התמונה בתפריט השיתוף של המכשיר, ואם אין אפשרות כזו, מוריד אותה */
export async function shareImage(blob: Blob, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], 'latzod.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled';
  }
  return saveFile(blob, 'latzod.png');
}
