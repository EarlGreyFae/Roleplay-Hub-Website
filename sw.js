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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(OLD_CACHE_PREFIX)).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
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
