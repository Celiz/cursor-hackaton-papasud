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


// ─────────────────────────────────────────────────────────────────────────────
// Caché para trabajar en el campo sin señal
//
// Sin esto la pantalla ni siquiera abre offline, y todo lo demás —la cola de
// fotos, el GPS— no sirve de nada. Se cachea el armazón de la app y los
// catálogos, que cambian poco.
//
// Las escrituras NO pasan por acá: van a la cola en IndexedDB, que sabe
// reintentar. Un service worker que reencola POST a ciegas duplica órdenes.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE = "papasud-campo-v1";

// Catálogos: cambian poco y hacen falta para elegir lote, tarea o insumo.
const CATALOGOS = [
  "/api/campo/catalogos",
  "/api/campo/pivotes",
];

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const esCatalogo = CATALOGOS.some((c) => url.pathname.startsWith(c));
  const esEstatico =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/referencia/") ||
    /\.(png|jpg|jpeg|svg|webp|woff2?)$/.test(url.pathname);

  // Catálogos: red primero para tener lo último, caché si no hay señal.
  if (esCatalogo) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || Response.error()))
    );
    return;
  }

  // Estáticos: caché primero, que no cambian.
  if (esEstatico) {
    event.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
            return res;
          })
      )
    );
    return;
  }

  // Navegación: si no hay red, se sirve lo último que se vio de esa pantalla.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/dashboard/campo")))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});
