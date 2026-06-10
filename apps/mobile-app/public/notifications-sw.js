self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const data = payload.data || {};
  event.waitUntil(
    self.registration.showNotification(payload.title || "I-NutriGuide", {
      body: payload.body || "You have a new notification.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data,
      tag: `inutriguide-${data.notification_id || data.type || "notification"}`,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const path = typeof rawUrl === "string" ? rawUrl.replace("inutriguide://", "/") : "/tabs/notifications";
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        return existing.focus().then(() => existing.navigate(targetUrl));
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
