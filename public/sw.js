// IEQ Service Worker — Phase 1
const CACHE = "ieq-v1";
const STATIC = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API calls — network only, no cache
  if (url.pathname.startsWith("/ieq/")) {
    return; // fall through to network
  }

  // Static assets — cache first
  if (request.destination === "document" || request.destination === "script" || request.destination === "style") {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }))
    );
  }
});

// Push notifications
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? "IEQ", {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag ?? "ieq-notification",
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.notification.data?.url) {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});
