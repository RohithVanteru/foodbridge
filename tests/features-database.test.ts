import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, pool } from "../db";
import { accountSettings, donations, notificationDeliveries, notificationQueue, notifications, privacyRequests, profiles, user } from "../db/schema";
import { updateSettings } from "../lib/server/account-features";
import { acceptDonation } from "../lib/server/donation-service";
import { queueNotifications, deliverNotifications } from "../lib/server/notification-worker";
import { matchingLocationSQL } from "../lib/server/location";
test("settings concurrency, location enforcement and notification deduplication", { skip: !process.env.TEST_DATABASE }, async () => {
  const db = getDb(), prefix = randomUUID(), supplier = prefix + "s", beneficiary = prefix + "b";
  try {
    await db.insert(profiles).values([{ id: supplier, email: supplier + "@test.invalid", role: "supplier", city: "alpha", verificationStatus: "verified" }, { id: beneficiary, email: beneficiary + "@test.invalid", role: "beneficiary", city: "beta", capacity: 100, verificationStatus: "verified", displayName: "Member", organizationName: "Home", phone: "1234567890", address: "Test address" }]);
    await db.insert(accountSettings).values({ userId: beneficiary, latitude: 0, longitude: 0, radiusKm: 25, emailEnabled: true });
    const [donation] = await db.insert(donations).values({ supplierUserId: supplier, supplierName: "Supplier", city: "alpha", latitude: 0.1, longitude: 0, foodDescription: "Rice", servings: 10, pickupAddress: "Test", pickupBy: new Date(Date.now() + 3600000).toISOString() }).returning();
    const found = await db.select().from(donations).where(matchingLocationSQL({ city: "beta", latitude: 0, longitude: 0, radiusKm: 25 }));
    assert.ok(found.some(d => d.id === donation.id));
    await acceptDonation(donation.id, beneficiary);
    const input = { revision: 0, displayName: "Updated", organizationName: "Home", phone: "1234567890", city: "beta", address: "Test address", capacity: 100, latitude: 0, longitude: 0, radiusKm: 25, emailEnabled: true, pushEnabled: false };
    await assert.rejects(updateSettings(beneficiary, { ...input, address: "New address" }), /active/);
    const results = await Promise.allSettled([updateSettings(beneficiary, input), updateSettings(beneficiary, input)]);
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    await db.insert(privacyRequests).values({ userId: beneficiary });
    await assert.rejects(updateSettings(beneficiary, { ...input, revision: 1 }), /deletion/);
    const [notice] = await db.insert(notifications).values({ userId: beneficiary, title: "Test", body: "Test notification" }).returning();
    await Promise.all([queueNotifications(), queueNotifications()]);
    assert.equal((await db.select().from(notificationQueue).where(eq(notificationQueue.notificationId, notice.id))).length, 1);
    assert.equal((await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.notificationId, notice.id))).length, 1);
    await deliverNotifications(100);
    // No auth-user fixture: the worker must skip rather than contact an unverified/nonexistent recipient.
    assert.equal((await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.notificationId, notice.id)))[0].status, "skipped");
    const recipient = prefix + "mail";
    await db.insert(user).values({ id: recipient, name: "Retry fixture", email: recipient + "@test.invalid", emailVerified: true });
    await db.insert(accountSettings).values({ userId: recipient, emailEnabled: true });
    const [retryNotice] = await db.insert(notifications).values({ userId: recipient, title: "Retry", body: "Test" }).returning();
    const smtpHost = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
    try {
      await queueNotifications(); await deliverNotifications(100);
      const [retry] = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.notificationId, retryNotice.id));
      assert.equal(retry.status, "pending"); assert.equal(retry.attempts, 1); assert.ok(retry.lastError);
      await db.update(accountSettings).set({ emailEnabled: false }).where(eq(accountSettings.userId, recipient));
      await db.update(notificationDeliveries).set({ nextAttemptAt: new Date(0) }).where(eq(notificationDeliveries.id, retry.id));
      await deliverNotifications(100);
      assert.equal((await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, retry.id)))[0].status, "skipped");
    } finally { if (smtpHost !== undefined) process.env.SMTP_HOST = smtpHost; }
  } finally { await pool.end(); }
});
