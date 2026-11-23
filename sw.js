// 端末内の画面を即座に返す（通信を待たない）。更新は裏で取得し、次回の起動から反映する
// 保存名は tabimap- で始める（ふたりログと混ざらない。そもそも別の場所に置くので領域も別）
const CACHE = 'tabimap-app-f4bccf7ab2a4';
const ASSETS = ["./app.css","./app.js","./vendor/leaflet.js","./vendor/leaflet.css","./icon-192.png","./icon-512.png","./manifest.json","./index.html","./config.js"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tabimap-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (url.origin !== self.location.origin || req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })).then(hit => hit || fetch(req)));
});
