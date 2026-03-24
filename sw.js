const CACHE = "athlete-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./react.min.js",
  "./react-dom.min.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // API calls: network only (Claude AI, OpenFoodFacts, Supabase)
  if (url.hostname !== location.hostname) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Local assets: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title: "ATHLÈTE", body: "Notification" };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: "./icon-192.png", badge: "./icon-192.png",
      vibrate: [200, 100, 200], tag: data.tag || "athlete", renotify: true
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(cls => {
      if (cls.length > 0) { cls[0].focus(); return; }
      return clients.openWindow("./");
    })
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "NOTIFY") {
    self.registration.showNotification(e.data.title, {
      body: e.data.body, icon: "./icon-192.png", vibrate: [200, 100, 200],
      tag: e.data.tag || "athlete", renotify: true
    });
  }
  if (e.data && e.data.type === "SCHEDULE") {
    setTimeout(() => {
      self.registration.showNotification(e.data.title, {
        body: e.data.body, icon: "./icon-192.png", vibrate: [300, 200, 300, 200, 300],
        tag: e.data.tag || "timer", renotify: true, requireInteraction: true
      });
    }, e.data.delay);
  }
});
