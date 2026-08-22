// Aeterna push notification service worker
// Handles incoming push messages and notification clicks (including actions).

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Aeterna", body: event.data.text() };
  }

  const {
    title = "Aeterna",
    body = "",
    icon = "/favicon.ico",
    badge = "/favicon.ico",
    tag,
    url,
    actions,
    data,
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate: [20, 40, 20, 40, 80],
    actions: actions || [],
    data: { url, ...(data || {}) },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  const targetUrl = data.url || "/dashboard";

  notification.close();

  // If there's a specific action handler URL, use it
  let urlToOpen = targetUrl;
  if (action && data.actionUrls && data.actionUrls[action]) {
    urlToOpen = data.actionUrls[action];
  } else if (action === "dismiss") {
    return; // just close
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open on the target URL, focus it
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
