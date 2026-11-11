// שמירת קובץ מהאפליקציה. באייפון (בעיקר כאפליקציה מותקנת) הורדה רגילה לא תמיד עובדת,
// ולכן משתמשים בתפריט השיתוף של המכשיר, שבו יש "שמירה בקבצים".

// typeof navigator: הקובץ נטען גם בזמן הבנייה (קובצי התזכורות), מחוץ לדפדפן
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** שומר קובץ. חייב להיקרא ישירות מתוך לחיצה, כדי שתפריט השיתוף ייפתח */
export async function saveFile(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (isIOS) {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return 'shared';
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  download(blob, name);
  return 'downloaded';
}

export { isIOS };
