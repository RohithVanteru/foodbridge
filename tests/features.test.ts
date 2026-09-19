import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceKm, matchesLocation } from "../lib/server/location";
import { settingsSchema } from "../lib/server/account-features";
import { allowedPushEndpoint, subscriptionSchema } from "../lib/server/push";
test("radius matching handles distance, missing coordinates and date-line crossing", () => {
  const home = { city: "alpha", latitude: 0, longitude: 0, radiusKm: 25 };
  assert.equal(distanceKm(home, home), 0);
  assert.equal(matchesLocation(home, { city: "beta", latitude: 0.1, longitude: 0 }), true);
  assert.equal(matchesLocation(home, { city: "alpha", latitude: 1, longitude: 0 }), false);
  assert.equal(matchesLocation(home, { city: "alpha", latitude: null, longitude: null }), true);
  assert.equal(matchesLocation(home, { city: "beta", latitude: null, longitude: null }), false);
  assert.ok(distanceKm({ city: "", latitude: 0, longitude: 179.9 }, { city: "", latitude: 0, longitude: -179.9 })! < 23);
  assert.ok(Number.isFinite(distanceKm(home, { city: "", latitude: 0, longitude: 180 })));
});
test("profile settings reject privilege fields and incomplete coordinates", () => {
  const input = { revision: 0, displayName: "Member", organizationName: "Home", phone: "1234567890", city: "CITY", address: "Test address", capacity: 100, latitude: null, longitude: null, radiusKm: 25, emailEnabled: false, pushEnabled: false };
  assert.equal(settingsSchema.parse(input).city, "city");
  for (const extra of [{ isAdmin: true }, { role: "supplier" }, { latitude: 12 }, { latitude: 91, longitude: 0 }, { radiusKm: 0 }, { capacity: -1 }, { revision: -1 }]) assert.equal(settingsSchema.safeParse({ ...input, ...extra }).success, false);
});
test("push endpoints cannot target arbitrary hosts or private services", () => {
  assert.equal(allowedPushEndpoint("https://fcm.googleapis.com/fcm/send/token"), true);
  assert.equal(allowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/token"), true);
  for (const value of ["https://localhost/push", "http://fcm.googleapis.com/push", "https://fcm.googleapis.com.evil.example/push", "https://127.0.0.1/push", "https://user:pass@fcm.googleapis.com/push", "https://fcm.googleapis.com:8080/push"]) assert.equal(allowedPushEndpoint(value), false);
  assert.equal(subscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/a", keys: { auth: "x", p256dh: "x" } }).success, false);
});
