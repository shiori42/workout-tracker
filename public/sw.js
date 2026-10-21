/* 筋トレ管理アプリ Service Worker */
const CACHE = "kintore-shell-v2";
/* 開発時（?dev=1）はキャッシュせず、通知処理のみ行う */
const DEV = new URL(self.location.href).searchParams.has("dev");

self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (DEV) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/", "/timer", "/analysis", "/profile"]).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* ページ遷移はネットワーク優先、オフライン時はキャッシュへフォールバック */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (DEV) return;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
    return;
  }
  if (req.url.includes("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

/* Web Push（サーバー側の送信設定後に利用） */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "筋トレ管理", body: event.data.text() };
  }
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focused = list.some((c) => c.focused === true);
      const opts = {
        body: data.body || "",
        tag: data.tag || undefined,
        renotify: true,
        silent: focused,
        icon: "/icons/192",
        badge: "/icons/192",
        vibrate: focused ? [] : [200, 100, 200],
        data: { url: data.url || "/" },
      };
      await self.registration.showNotification(data.title || "筋トレ管理", opts);
      // 画面を見ているときはアプリ内のビープ音に任せる。iOS は push 内で通知を出さないと既定の通知が出るので、無音で出してすぐ閉じる
      if (focused && data.tag) {
        const notes = await self.registration.getNotifications({ tag: data.tag });
        for (const n of notes) n.close();
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if ("navigate" in c && url !== "/") c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
