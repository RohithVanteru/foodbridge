import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { accountSettings, auditEvents, claims, communityPosts, donations, incidents, media, notificationDeliveries, notifications, privacyRequests, profiles, pushSubscriptions, referrals, user } from "@/db/schema";
import { requireApiAdministrator } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
export async function GET(request: Request) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const [privacy, deliveries] = await Promise.all([
    getDb().select().from(privacyRequests).orderBy(desc(privacyRequests.createdAt)).limit(100),
    getDb().select().from(notificationDeliveries).orderBy(desc(notificationDeliveries.id)).limit(100),
  ]);
  return noStoreJson({ privacy, deliveries });
}
export async function POST(request: Request) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.discriminatedUnion("action", [z.object({ action: z.literal("retry"), id: z.number().int().positive() }), z.object({ action: z.literal("delete_account"), userId: z.string().min(1).max(200), confirmation: z.literal("ANONYMIZE AND DELETE LOGIN") })]));
    await getDb().transaction(async tx => {
      if (data.action === "retry") {
        await tx.update(notificationDeliveries).set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), lastError: null }).where(and(eq(notificationDeliveries.id, data.id), eq(notificationDeliveries.status, "failed")));
      } else {
        const id = data.userId;
        const [profile] = await tx.select().from(profiles).where(eq(profiles.id, id)).for("update");
        const [request] = await tx.select().from(privacyRequests).where(eq(privacyRequests.userId, id)).for("update");
        if (!profile || profile.isAdmin || id === identity.user.userId || request?.status !== "pending") throw new Error("An outstanding non-admin deletion request is required.");
        const active = await tx.select({ id: donations.id }).from(donations).leftJoin(claims, eq(claims.donationId, donations.id)).where(and(inArray(donations.status, ["available", "claimed"]), or(eq(donations.supplierUserId, id), eq(claims.beneficiaryUserId, id)))).limit(1);
        const open = await tx.select({ id: incidents.id }).from(incidents).where(and(eq(incidents.reporterId, id), ne(incidents.status, "resolved"))).limit(1);
        if (active.length || open.length) throw new Error("Resolve active pickups and incident reports before deletion.");
        await tx.update(profiles).set({ email: `deleted-${crypto.randomUUID()}@invalid.example`, displayName: "Deleted member", organizationName: null, phone: "", city: "", address: "", capacity: 0, verificationStatus: "rejected" }).where(eq(profiles.id, id));
        await tx.update(donations).set({ supplierName: "Deleted member", foodDescription: "Removed", pickupAddress: "", instructions: "", city: "", latitude: null, longitude: null, dietaryNotes: "[]" }).where(eq(donations.supplierUserId, id));
        await tx.update(communityPosts).set({ body: "Post removed", imageKey: null, status: "rejected" }).where(eq(communityPosts.authorUserId, id));
        await tx.delete(media).where(eq(media.ownerId, id));
        await tx.delete(referrals).where(eq(referrals.volunteerId, id));
        await tx.update(incidents).set({ description: "Removed after deletion request", resolution: "Removed", internalNotes: "" }).where(eq(incidents.reporterId, id));
        await tx.delete(notifications).where(eq(notifications.userId, id));
        await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
        await tx.delete(accountSettings).where(eq(accountSettings.userId, id));
        await tx.delete(user).where(eq(user.id, id));
        await tx.update(privacyRequests).set({ status: "completed" }).where(eq(privacyRequests.userId, id));
      }
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "operations." + data.action, targetType: data.action === "retry" ? "delivery" : "profile", targetId: data.action === "retry" ? String(data.id) : data.userId });
    });
    return noStoreJson({ ok: true });
  } catch (error) { return noStoreJson({ error: error instanceof Error && !('code' in error) ? error.message : "Operation failed." }, { status: 400 }); }
}
