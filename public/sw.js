// ============================================
// Alter — Service Worker (Offline + Cache)
// ============================================
const CACHE_NAME = 'alter-v2';
const STATIC_SHELL = ['/', '/index.html'];

// Install — pre-cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_SHELL))
    );
    self.skipWaiting();
});

// Activate — cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — smart caching strategy per request type
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Never cache API calls — always network
    if (url.pathname.startsWith('/api')) return;

    // Cache-first for versioned static assets (JS, CSS, fonts, images)
    // Vite adds hashes to filenames, so cached versions are always correct
    if (url.pathname.startsWith('/assets/') ||
        event.request.destination === 'script' ||
        event.request.destination === 'style' ||
        event.request.destination === 'font') {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached || new Response('Offline', { status: 503 }));
            })
        );
        return;
    }

    // Network-first for HTML (always get fresh, fallback to cache)
    if (event.request.destination === 'document' || event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request) || caches.match('/index.html'))
        );
        return;
    }

    // Default: network with cache fallback
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response.ok && event.request.method === 'GET') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});
