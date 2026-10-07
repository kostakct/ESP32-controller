const CACHE_NAME = 'esp32-ewelink-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Zásadní požadavek pro Chrome: Musí existovat fetch handler, jinak to nepovažuje za plnohodnotné PWA.
// Tento jednoduchý handler požadavek jen propustí z internetu, ale uspokojí interní validátor Androidu.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Aplikace aktuálně nemá připojení k internetu.');
    })
  );
});
