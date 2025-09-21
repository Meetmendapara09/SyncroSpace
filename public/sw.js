// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  const data = event.data?.json() || {};
  const title = data.title || 'Notification';
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
