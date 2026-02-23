// Service Worker - تحديثات أسرع + كاش آمن
const CACHE = "joodkids-v22";
const ASSETS = [
  "./",
  "./index.html",
  "./product.html",
  "./contact.html",
  "./policy.html",
  "./admin.html",
  "./import.html",
  "./styles.css",
  "./app.js",
  "./product.js",
  "./contact.js",
  "./admin.js",
  "./import.js",
  "./install.js",
  "./policy.js",
  "./firebase-config.js",
  "./cloudinary-config.js",
  "./manifest.json",
  "./sw.js",
  "./favicon.svg",
  "./favicon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./pay-instapay.svg",
  "./pay-vodafonecash.svg",
  "./pay-etisalatcash.svg",
  "./pay-orangecash.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

// Network-first للـ HTML/JS/CSS عشان التحديثات تظهر فورًا
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // تجاهل أي طلبات خارج نفس الدومين
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === "navigate" || (req.destination === "document");
  const isCore = ["script", "style"].includes(req.destination);

  if (isHTML || isCore) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first لباقي الملفات
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Allow manual update trigger
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
