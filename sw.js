// sw.js
const CACHE_NAME = 'tpm-app-v197'; // ⬅️ تم التحديث
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',     
  './app.js',        
  './config.js',     
  './manifest.json',
  './icon.png',
  // ⬅️ أضفنا الملفات الجديدة عشان تشتغل أوفلاين
  './js/main.js',
  './js/config/env.js',
  './js/core/firebase-init.js',
  './js/utils/validator.js'
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
