const CACHE = "athlete-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
];

// Install — cache les assets
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {})));
    })
  );
  self.skipWaiting();
});

// Activate — supprime les vieux caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve depuis le cache si dispo
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

// Push notifications (depuis le service worker)
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
      requireInteraction: data.important || false,
      data: data
    })
  );
});

// Clic sur notification → ouvre l'app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) { cls[0].focus(); return; }
      return clients.openWindow("./");
    })
  );
});

// Message depuis la page principale (timer, ftour, etc.)
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
  // Notification programmée (ex: ftour à 18h45)
  if (e.data && e.data.type === "SCHEDULE") {
    const delay = e.data.delay; // ms
    setTimeout(() => {
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        icon: "./icon-192.png",
        vibrate: [300, 200, 300, 200, 300],
        tag: "ftour",
        renotify: true,
        requireInteraction: true
      });
    }, delay);
  }
});
