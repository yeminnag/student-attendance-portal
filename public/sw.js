self.addEventListener("push", (event) => {
    let payload = { title: "出席率パンネル", body: "", url: "/" };
    try {
        payload = { ...payload, ...(event.data?.json() ?? {}) };
    } catch {
        payload.body = event.data?.text() ?? payload.body;
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: "/favicon.png",
            badge: "/favicon.png",
            data: { url: payload.url ?? "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url ?? "/";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ("focus" in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return undefined;
        })
    );
});
