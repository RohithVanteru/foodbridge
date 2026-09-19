import { randomUUID } from "node:crypto";
import webpush from "web-push";
import { and, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accountSettings, claims, donations, notificationDeliveries as deliveries, notificationQueue, notifications, pickupReminders, pushSubscriptions, user } from "@/db/schema";
import { sendMail } from "./mail";
import { allowedPushEndpoint } from "./push";

export async function queueNotifications() {
  const db = getDb();
  await db.transaction(async tx => {
    const due = await tx.select().from(donations).where(and(eq(donations.status, "claimed"), gt(donations.pickupBy, new Date().toISOString()), lte(donations.pickupBy, new Date(Date.now() + 30 * 60000).toISOString()))).limit(100).for("update", { skipLocked: true });
    for (const donation of due) {
      const inserted = await tx.insert(pickupReminders).values({ donationId: donation.id }).onConflictDoNothing().returning();
      if (!inserted.length) continue;
      const [claim] = await tx.select().from(claims).where(eq(claims.donationId, donation.id));
      if (claim) await tx.insert(notifications).values([donation.supplierUserId, claim.beneficiaryUserId].map(userId => ({ userId, title: "Pickup deadline approaching", body: "Your reserved pickup is due within 30 minutes. Check My pickups for its current status.", href: "/pickups" })));
    }
    const pending = await tx.select({ notification: notifications }).from(notifications).leftJoin(notificationQueue, eq(notificationQueue.notificationId, notifications.id)).where(isNull(notificationQueue.notificationId)).limit(100).for("update", { of: notifications, skipLocked: true });
    for (const { notification: n } of pending) {
      const [prefs] = await tx.select().from(accountSettings).where(eq(accountSettings.userId, n.userId));
      // Old unread history must not suddenly generate email when notifications are enabled.
      if (new Date(n.createdAt).getTime() > Date.now() - 24 * 3600000) {
        if (prefs?.emailEnabled) await tx.insert(deliveries).values({ userId: n.userId, notificationId: n.id, channel: "email" }).onConflictDoNothing();
        if (prefs?.pushEnabled) {
          const subscriptions = await tx.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, n.userId));
          if (subscriptions.length) await tx.insert(deliveries).values(subscriptions.map(s => ({ userId: n.userId, notificationId: n.id, channel: "push", target: s.id }))).onConflictDoNothing();
        }
      }
      await tx.insert(notificationQueue).values({ notificationId: n.id }).onConflictDoNothing();
    }
  });
}

export async function deliverNotifications(limit = 20) {
  const db = getDb(); let processed = 0;
  for (let i = 0; i < limit; i++) {
    const job = await db.transaction(async tx => {
      const [candidate] = await tx.select().from(deliveries).where(and(inArray(deliveries.status, ["pending", "sending"]), lte(deliveries.nextAttemptAt, new Date()))).orderBy(deliveries.id).limit(1).for("update", { skipLocked: true });
      if (!candidate) return null;
      const [leased] = await tx.update(deliveries).set({ status: "sending", lease: randomUUID(), attempts: candidate.attempts + 1, nextAttemptAt: new Date(Date.now() + 5 * 60000) }).where(eq(deliveries.id, candidate.id)).returning();
      return leased;
    });
    if (!job) break;
    let status = "sent", lastError: string | null = null;
    try {
      const [prefs] = await db.select().from(accountSettings).where(eq(accountSettings.userId, job.userId));
      const [recipient] = await db.select({ email: user.email, verified: user.emailVerified }).from(user).where(eq(user.id, job.userId));
      const [notification] = await db.select().from(notifications).where(eq(notifications.id, job.notificationId));
      if (job.attempts > 5) { status = "failed"; lastError = "Retry budget exhausted after interrupted delivery."; }
      else if (!recipient?.verified || !notification || (job.channel === "email" ? !prefs?.emailEnabled : !prefs?.pushEnabled) || new Date(notification.createdAt).getTime() < Date.now() - 24 * 3600000) status = "skipped";
      else if (job.channel === "email") await sendMail(recipient.email, "FoodBridge: new account update", `You have an update in FoodBridge. Sign in to view it: ${process.env.BETTER_AUTH_URL}/notifications\n\nManage email preferences in Account settings.`);
      else {
        const [subscription] = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.id, job.target), eq(pushSubscriptions.userId, job.userId)));
        if (!subscription || !allowedPushEndpoint(subscription.endpoint)) status = "skipped";
        else {
          try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: "FoodBridge update", body: "Sign in to view your notifications.", url: "/notifications" }), { TTL: 300, timeout: 15000, vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! } }); }
          catch (error) {
            if (error instanceof webpush.WebPushError && [404, 410].includes(error.statusCode)) { await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id)); status = "skipped"; }
            else throw error;
          }
        }
      }
    } catch { status = job.attempts >= 5 ? "failed" : "pending"; lastError = "Delivery provider failed. Check server configuration and provider health."; }
    await db.update(deliveries).set({ status, lastError, lease: null, nextAttemptAt: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60000) }).where(and(eq(deliveries.id, job.id), sql`${deliveries.lease} = ${job.lease}`));
    processed++;
  }
  return { processed };
}
