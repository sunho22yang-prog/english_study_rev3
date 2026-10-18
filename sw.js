// 주간 영어 복습 — offline app shell + weekly data cache.
// index.html / manifest / icons 를 바꾸면 CACHE_NAME 의 v 숫자를 올리세요.
var CACHE_NAME = "weekly-review-v5";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(APP_SHELL.map(function (url) {
        return fetch(url, { cache: "no-store" }).then(function (res) {
          if (res && res.ok) return cache.put(url, res);
        }).catch(function () { /* 첫 설치 때 오프라인이면 무시 */ });
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  var isData = url.pathname.indexOf("/data/") !== -1;

  if (isData) {
    // 주차 데이터는 네트워크 우선 — 새 주차가 올라오면 바로 잡히도록.
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 앱 껍데기는 캐시 우선 + 백그라운드 갱신.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request, { cache: "no-store" }).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
