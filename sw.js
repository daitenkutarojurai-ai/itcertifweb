/**
 * sw.js — service worker for certquests.com
 *
 * Strategy:
 *   - HTML pages: network-first (fall back to cache when offline)
 *   - CSS / JS / images / fonts: stale-while-revalidate
 *   - Question/learning JSON data: stale-while-revalidate too
 *   - Cross-origin (Google Fonts): cache-first with long TTL
 *
 * Bump CACHE_VERSION to invalidate clients on next visit.
 */

const CACHE_VERSION = 'v1-2026-04-25';
const RUNTIME_CACHE = `cq-runtime-${CACHE_VERSION}`;
const PRECACHE      = `cq-precache-${CACHE_VERSION}`;

// Critical paths to precache so the homepage works fully offline on second load
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/styles/main.css',
  '/src/styles/desktop.css',
  '/src/assets/icons/favicon-96.png?v=4',
  '/src/assets/icons/favicon-32.png?v=4',
  '/src/assets/icons/favicon-192.png?v=4',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== PRECACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isHTML(request) {
  return request.mode === 'navigate' ||
    (request.destination === 'document') ||
    (request.headers.get('accept') || '').includes('text/html');
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Only fall back to index.html for root-like navigations, not arbitrary paths
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; skip everything else (POST, etc.)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin except for Google Fonts (which we want cached aggressively)
  if (url.origin !== self.location.origin) {
    if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
      event.respondWith(staleWhileRevalidate(req));
    }
    return; // Let the browser handle other cross-origin requests
  }

  // HTML pages: network-first
  if (isHTML(req)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// Allow page to ask the SW to skip waiting (manual update flow)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
