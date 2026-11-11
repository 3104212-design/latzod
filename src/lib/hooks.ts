import { useEffect, useState } from 'react';

/** הזמן הנוכחי, מתעדכן כל `interval` מילישניות */
export function useNow(interval = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

/** מקטין תמונה ומחזיר אותה כ-JPEG ב-data URL, כדי שתיכנס לאחסון המקומי */
export async function compressImage(file: File, max = 720, quality = 0.72): Promise<string> {
  // createImageBitmap לא מפענח בכל המכשירים כל סוג תמונה (למשל HEIC מאייפון), ולכן יש גם דרך גיבוי
  let src: CanvasImageSource & { width: number; height: number };
  let cleanup = () => {};
  try {
    const bmp = await createImageBitmap(file);
    src = bmp;
    cleanup = () => bmp.close();
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    src = img;
    cleanup = () => URL.revokeObjectURL(url);
  }
  const w = (src as HTMLImageElement).naturalWidth || src.width;
  const h = (src as HTMLImageElement).naturalHeight || src.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(src, 0, 0, canvas.width, canvas.height);
  cleanup();
  return canvas.toDataURL('image/jpeg', quality);
}
