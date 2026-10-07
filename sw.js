// This service worker exists solely to receive Web Push notifications
// (registration is required for push to work at all). It deliberately does
// NOT cache or intercept any fetches - this app syncs live over WebSocket
// and REST, so a cached response is never "fine to serve," it's just wrong.
// A previous version of this file did cache-first caching here, which
// froze accounts on stale data (sometimes permanently, since a cached
// bootstrap response never expires on its own) - never bring that back.
const OLD_CACHE_PREFIX = 'vora-rphub-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

// Self-healing for stale installed PWAs (iOS Home Screen apps especially):
// those resume an already-loaded page from a suspended background process
// instead of doing a fresh navigation, so a stale client can sit forever
// with no network request ever happening - no Cache-Control header, no
// client-side "check for updates" script, nothing server-side can reach it.
// But a NEW service worker installing is itself independent of what that
// stale page's JS does: the browser fetches and byte-compares this exact
// file on its own schedule. Once a new version of sw.js does take over
// (skipWaiting + clients.claim), force every window it now controls -
// visible or not - to actually re-navigate, so the next time any of this
// app's windows become live again, they're guaranteed to fetch fresh
// index.html/ui.js/etc. instead of just resuming old, already-running JS.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(OLD_CACHE_PREFIX)).map((key) => caches.delete(key))
    ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clientList) => Promise.all(clientList.map((client) => {
        try { return client.navigate(client.url); } catch (e) { return null; }
      })))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'Roleplay Hub', body: 'You have a new notification.', url: './' };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'roleplay-hub',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
