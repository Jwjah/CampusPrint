// CampusPrint Production Service Worker v2.0
// Ensures instantaneous updates after deployment with zero stale UI state

const BUILD_ID = 'campusprint-v2.0.0-' + Date.now();
const STATIC_CACHE = `cp-static-${BUILD_ID}`;
const DYNAMIC_CACHE = `cp-dynamic-${BUILD_ID}`;
const API_CACHE = `cp-api-v2`;

// Core static app shell files to precache
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version ${BUILD_ID}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache warning:', err);
      });
    })
  );
  // Force immediate takeover without waiting for window reload
  self.skipWaiting();
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating new version ${BUILD_ID}...`);
  event.waitUntil(
    (async () => {
      // Cleanup all old caches from previous deployments
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith('cp-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Purging outdated deployment cache:', key);
            return caches.delete(key);
          })
      );

      // Claim all clients immediately so control is transferred to this new Service Worker
      await self.clients.claim();

      // Broadcast update notification to all active client windows
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clientList.forEach((client) => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: BUILD_ID,
        });
      });
    })()
  );
});

// ─── FETCH ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE are live operations)
  if (request.method !== 'GET') return;

  // Skip non-http(s) scheme extensions
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: HTML Navigation & Document requests -> Strict Network-First
  // Prevents old HTML referencing outdated bundle chunk hashes after deployment
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Strategy 2: API calls -> Network-First with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Strategy 3: Static Hashed JS/CSS Assets (`/_next/static/*`) -> Cache-First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 4: Static Public Assets (images, fonts, icons) -> Cache-First with Network Revalidation
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot|ico)$/)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 5: Third-party CDNs / External assets -> Stale-While-Revalidate
  if (url.origin !== self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstApi(request));
});

// ─── PUSH NOTIFICATIONS ────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'CampusPrint', message: 'You have a new update' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.warn('[SW] Push data parse failed:', e);
  }

  const options = {
    body: data.message || data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: data.tag || 'campusprint-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
    },
  };

  try {
    const channel = new BroadcastChannel('push-notification');
    channel.postMessage({ type: 'push-received', data });
  } catch (err) {
    // Ignore BroadcastChannel errors if unavailable
  }

  event.waitUntil(self.registration.showNotification(data.title || 'CampusPrint', options));
});

// ─── NOTIFICATION CLICK ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── HELPER STRATEGIES ─────────────────────────────────────

async function networkFirstNavigation(request) {
  try {
    // Fetch fresh HTML from network with cache bust headers
    const networkResponse = await fetch(request, { cache: 'no-cache' });
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline fallback: try cache, then offline.html
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;

    return new Response('<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function networkFirstApi(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response(JSON.stringify({ error: 'Network connection unavailable', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}
