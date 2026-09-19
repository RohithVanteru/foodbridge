/* Push only: never cache authenticated pages, API responses, or photos. */
self.addEventListener("push", event => {
  event.waitUntil(self.registration.showNotification("FoodBridge update", { body: "Sign in to view your notifications.", data: { url: "/notifications" } }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL("/notifications", self.location.origin).href));
});
