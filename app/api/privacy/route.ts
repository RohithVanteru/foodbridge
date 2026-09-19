import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { accountSettings, auditEvents, claims, communityPosts, donations, incidents, media, notifications, privacyRequests, profiles, referrals } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
export async function GET(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const db = getDb(), id = identity.user.userId;
  if (new URL(request.url).searchParams.get("export") === "1") {
    const [settings, ownedDonations, pickups, posts, notices, ownReferrals, reports] = await Promise.all([
      db.select().from(accountSettings).where(eq(accountSettings.userId, id)), db.select().from(donations).where(eq(donations.supplierUserId, id)),
      db.select().from(claims).where(eq(claims.beneficiaryUserId, id)), db.select().from(communityPosts).where(eq(communityPosts.authorUserId, id)),
      db.select().from(notifications).where(eq(notifications.userId, id)), db.select().from(referrals).where(eq(referrals.volunteerId, id)),
      db.select({ id: incidents.id, category: incidents.category, description: incidents.description, status: incidents.status, resolution: incidents.resolution, createdAt: incidents.createdAt }).from(incidents).where(eq(incidents.reporterId, id)),
    ]);
    return noStoreJson({ exportedAt: new Date().toISOString(), profile: identity.profile, settings, donations: ownedDonations, pickups, posts, notifications: notices, referrals: ownReferrals, incidents: reports }, { headers: { "Content-Disposition": 'attachment; filename="foodbridge-personal-data.json"' } });
  }
  const [deletion] = await db.select().from(privacyRequests).where(eq(privacyRequests.userId, id));
  const images = await db.select({ key: media.key }).from(media).where(eq(media.ownerId, id));
  return noStoreJson({ deletion: deletion ?? null, images });
}
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.discriminatedUnion("action", [z.object({ action: z.literal("request_deletion"), confirmation: z.literal("DELETE MY ACCOUNT") }), z.object({ action: z.literal("cancel_deletion") }), z.object({ action: z.literal("withdraw_photo"), key: z.string().regex(/^[a-f0-9-]+\.webp$/) })]));
    await getDb().transaction(async tx => {
      await tx.select().from(profiles).where(eq(profiles.id, identity.user.userId)).for("update");
      if (data.action === "withdraw_photo") {
        const [owned] = await tx.select().from(media).where(and(eq(media.key, data.key), eq(media.ownerId, identity.user.userId))).for("update");
        if (!owned) throw new Error("Photo not found.");
        await tx.update(communityPosts).set({ imageKey: null, status: "pending" }).where(eq(communityPosts.imageKey, "/api/media/" + data.key));
        await tx.delete(media).where(eq(media.key, data.key));
      } else if (data.action === "cancel_deletion") {
        await tx.delete(privacyRequests).where(and(eq(privacyRequests.userId, identity.user.userId), eq(privacyRequests.status, "pending")));
      } else {
        if (identity.profile.isAdmin) throw new Error("Transfer administrator responsibilities before requesting account deletion.");
        const active = await tx.select({ id: donations.id }).from(donations).leftJoin(claims, eq(claims.donationId, donations.id)).where(and(inArray(donations.status, ["available", "claimed"]), or(eq(donations.supplierUserId, identity.user.userId), eq(claims.beneficiaryUserId, identity.user.userId)))).limit(1);
        if (active.length) throw new Error("Finish or cancel active donations and pickups first.");
        await tx.insert(privacyRequests).values({ userId: identity.user.userId }).onConflictDoNothing();
      }
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "privacy." + data.action, targetType: "profile", targetId: identity.user.userId });
    });
    return noStoreJson({ ok: true });
  } catch (error) { return noStoreJson({ error: error instanceof Error && !('code' in error) ? error.message : "Privacy action failed." }, { status: 400 }); }
}
