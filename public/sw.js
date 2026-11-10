// Service worker: שומר את קבצי האפליקציה כדי שתעבוד גם בלי אינטרנט.
const CACHE = 'latzod-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png']);
      // קבצי הבנייה (JS ו-CSS) שהדף טוען, כדי שהאפליקציה תעבוד בלי אינטרנט כבר אחרי הביקור הראשון
      const html = await (await c.match('./index.html')).text();
      const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => './' + m[1]);
      if (assets.length) await c.addAll(assets);
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    // מוחקים רק מטמונים ישנים של האפליקציה הזו. ב-github.io כמה אתרים חולקים את אותו מקור
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('latzod-') && k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // דפים: קודם רשת (כדי לקבל עדכונים), ואם אין חיבור, מהמטמון
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // קבצים סטטיים: קודם מטמון, ואם אין, רשת ושמירה
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
