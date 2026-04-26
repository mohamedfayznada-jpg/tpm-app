const CACHE_NAME = 'tpm-app-v142';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',     // ⚠️ مهم جداً
  './app.js',        // ⚠️ الكود الأساسي
  './config.js',     // ⚠️ الإعدادات
  './manifest.json',
  './icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// مسح الكاش القديم عشان التحديثات تظهر للعمال فوراً
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});