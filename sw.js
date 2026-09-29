/* ATHLÈTE v7 — Service worker
   - Page (index.html) : réseau d'abord → tu reçois toujours la dernière version, cache si hors-ligne
   - Fichiers locaux (react, icônes) : cache d'abord
   - Tout le reste (API, polices) : réseau direct, jamais d'erreur bloquante */
const CACHE = "athlete-v7-2";
const ASSETS = ["./", "./index.html", "./manifest.json", "./react.min.js", "./react-dom.min.js", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => c.add(new Request(a, {cache: "reload"})).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // API, polices : laissés au navigateur

  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isPage) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});

self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "NOTIFY" && self.registration.showNotification) {
    self.registration.showNotification(d.title || "ATHLÈTE", {body: d.body || "", icon: "./icon-192.png", tag: d.tag || "athlete", renotify: true});
  }
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type: "window", includeUncontrolled: true}).then(cls => cls.length ? cls[0].focus() : clients.openWindow("./")));
});
