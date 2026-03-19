// public/sw.js — Service Worker for Web Push Notifications
// Automatically registered by NotificationButton component

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "MobileHub", body: event.data.text() };
  }

  const { title = "MobileHub CRM", body = "", icon, badge, url = "/admin", tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: icon || "/icons/icon-192.png",
      badge: badge || "/icons/badge-72.png",
      tag: tag || "mobilehub",
      data: { url },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Open new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync / keep-alive
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
