/* eslint-disable no-undef -- läuft im Service Worker, Dateiliste setzt der Build ein */
/*
 * Service Worker (U5). Der Build ersetzt VERSION und PRECACHE (siehe `pwa-plugin.ts`).
 *
 * - Alle Dateien des Builds liegen vorab im Cache, die App startet damit auch ohne Netz.
 * - Jede Version hat einen eigenen Cache. Eine geöffnete Seite behält so ihre alten Dateien
 *   (Karten!), bis sie neu geladen wird – keine weißen Karten nach einem Deploy.
 * - Eine neue Version wartet, bis die Seite „Neu laden“ meldet (SKIP_WAITING); mitten im Spiel
 *   wird nichts von allein ausgetauscht.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `schafkopf-${VERSION}`;

self.addEventListener('install', (event) => {
  // `cache: 'reload'` umgeht den HTTP-Cache, sonst landen u. U. alte Dateien im neuen Cache.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('schafkopf-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Einladungslinks (#tisch=…) und Suchparameter ändern nichts an der Seite selbst.
  const key = request.mode === 'navigate' ? new URL('./', self.registration.scope).href : request;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(key, { ignoreSearch: request.mode === 'navigate' }))
      .then((hit) => hit ?? fetch(request)),
  );
});
