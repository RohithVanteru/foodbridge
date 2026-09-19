import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accountSettings, auditEvents, claims, donations, notifications, privacyRequests, profiles } from "@/db/schema";
import { matchesLocation } from "./location";

export async function acceptDonation(id: number, userId: string) {
  return getDb().transaction(async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).for("update");
    if (!profile || profile.role !== "beneficiary" || profile.verificationStatus !== "verified") throw new Error("A verified beneficiary is required.");
    const [deletion] = await tx.select().from(privacyRequests).where(eq(privacyRequests.userId, userId));
    if (deletion?.status === "pending") throw new Error("Cancel your deletion request before accepting food.");
    const [location] = await tx.select().from(accountSettings).where(eq(accountSettings.userId, userId));
    const [donation] = await tx.update(donations).set({ status: "claimed" }).where(and(
      eq(donations.id, id), eq(donations.status, "available"), gt(donations.pickupBy, new Date().toISOString()),
      sql`${donations.servings} <= ${profile.capacity}`,
    )).returning();
    if (!donation) throw new Error("Donation unavailable, expired, or above your capacity.");
    if (!matchesLocation({ city: profile.city, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, radiusKm: location?.radiusKm }, donation)) throw new Error("Donation is outside your matching area.");
    const [supplier] = await tx.select().from(profiles).where(eq(profiles.id, donation.supplierUserId));
    if (!supplier || supplier.verificationStatus !== "verified") throw new Error("Supplier is not verified.");
    const [claim] = await tx.insert(claims).values({ donationId: id, beneficiaryUserId: userId }).returning();
    await tx.insert(auditEvents).values({ actorUserId: userId, action: "donation.claimed", targetType: "donation", targetId: String(id) });
    await tx.insert(notifications).values([
      { userId: donation.supplierUserId, title: "Donation accepted", body: `${profile.organizationName} reserved ${donation.foodDescription}.`, href: "/pickups" },
      { userId, title: "Pickup reserved", body: "Pickup address and contact details are available in My pickups.", href: "/pickups" },
    ]);
    return claim;
  });
}

export async function changeDonationStatus(id: number, userId: string, admin: boolean, next: "collected" | "cancelled" | "expired") {
  return getDb().transaction(async (tx) => {
    const [current] = await tx.select().from(donations).where(eq(donations.id, id)).for("update");
    if (!current) throw new Error("Donation not found.");
    const [claim] = await tx.select().from(claims).where(eq(claims.donationId, id));
    const participant = current.supplierUserId === userId || claim?.beneficiaryUserId === userId;
    if (!admin && !participant) throw new Error("Only pickup participants can change this donation.");
    const allowed = current.status === "available" ? ["cancelled", "expired"] : current.status === "claimed" ? ["collected", "cancelled", "expired"] : [];
    if (!allowed.includes(next) || (next === "expired" && (!admin || new Date(current.pickupBy) > new Date()))) throw new Error("Invalid status transition.");
    if (next === "collected" && new Date(current.pickupBy) <= new Date()) throw new Error("The pickup deadline has passed. Contact an administrator.");
    const [donation] = await tx.update(donations).set({ status: next }).where(eq(donations.id, id)).returning();
    if (claim) await tx.update(claims).set({ status: next === "collected" ? "collected" : "cancelled" }).where(eq(claims.id, claim.id));
    await tx.insert(auditEvents).values({ actorUserId: userId, action: "donation." + next, targetType: "donation", targetId: String(id), metadata: JSON.stringify({ previousStatus: current.status }) });
    const recipients = [...new Set([current.supplierUserId, ...(claim ? [claim.beneficiaryUserId] : [])])];
    await tx.insert(notifications).values(recipients.map(userId => ({ userId, title: "Pickup " + next, body: current.foodDescription, href: "/pickups" })));
    return donation;
  });
}
