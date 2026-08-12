const CACHE_NAME = 'factory-os-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // الطريقة دي بتمنع الكاش من الانهيار لو فيه ملف ناقص
      for (let url of urlsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
        } catch (e) {
          console.warn('تخطي ملف في الكاش:', url);
        }
      }
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
