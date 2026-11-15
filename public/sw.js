// 機内モードでも起動・解析できるよう、アプリ本体とモデルを端末にキャッシュする。
// キャッシュ名の VERSION は build 時に置き換わる（vite.config.ts の swVersion）。
const VERSION = '__SW_VERSION__';
const CACHE = `hum-memo-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch('./precache.json', { cache: 'no-store' });
      const urls = await res.json();
      await cache.addAll(urls);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('hum-memo-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch (e) {
        // 画面遷移のリクエストが失敗した時は、キャッシュ済みの入口を返す
        if (req.mode === 'navigate') return (await caches.match('./index.html')) ?? Response.error();
        throw e;
      }
    })(),
  );
});
