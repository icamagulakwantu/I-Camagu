/* Phone notifications, loaded into the app's service worker (vite.config.js,
   workbox.importScripts). Shows each message the server sends, and opens the
   right screen when it is tapped. */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'i-Camagu';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/notification-icon-192.png',
    badge: '/icons/notification-badge-96.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/me/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/me/notifications';
  // Only ever open a page of this app.
  const path = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/me/notifications';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) {
      // Tell the app where to go first; bringing it to the front can be
      // refused, and must not stop the screen from changing.
      open.postMessage({ type: 'icamagu:open', path });
      try { await open.focus(); } catch { /* not allowed: the screen still changed */ }
      return;
    }
    await self.clients.openWindow(path);
  })());
});
