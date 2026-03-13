const CACHE = "athlete-v6-local";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./react.min.js",
  "./react-dom.min.js",
  "./icon-192.png",
  "./icon-512.png"
];

// Install — cache all local assets
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Activate — delete ALL old caches (force fresh)
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Local assets: cache-first (fast offline)
// - Google Fonts: stale-while-revalidate (works offline after first load)
// - Other: network-first
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // Google Fonts — stale-while-revalidate
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(res => {
            if (res && res.status === 200) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Local assets — cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => {
          // Only return index.html for navigation requests
          if (e.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
    );
    return;
  }

  // External — network only, no caching
  e.respondWith(fetch(e.request));
});

// Push notifications
self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title: "ATHLÈTE", body: "Notification" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200, 100, 200],
      tag: data.tag || "athlete",
      renotify: true,
      requireInteraction: data.important || false
    })
  );
});

// Notification click → open app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) { cls[0].focus(); return; }
      return clients.openWindow("./");
    })
  );
});

// Messages from app (timer beep, scheduled notifications)
self.addEventListener("message", e => {
  if (e.data && e.data.type === "NOTIFY") {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: "./icon-192.png",
      vibrate: [200, 100, 200],
      tag: e.data.tag || "athlete",
      renotify: true
    });
  }
  if (e.data && e.data.type === "SCHEDULE") {
    setTimeout(() => {
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        icon: "./icon-192.png",
        vibrate: [300, 200, 300, 200, 300],
        tag: e.data.tag || "scheduled",
        renotify: true,
        requireInteraction: true
      });
    }, e.data.delay);
  }
});
