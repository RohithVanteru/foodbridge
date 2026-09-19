import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { accountSettings, auditEvents, claims, donations, notifications, privacyRequests, profiles } from "@/db/schema";

export const settingsSchema = z.object({
  revision: z.number().int().nonnegative(), displayName: z.string().trim().min(1).max(120),
  organizationName: z.string().trim().max(160), phone: z.string().regex(/^\+?[0-9 ()-]{7,32}$/),
  city: z.string().trim().min(2).max(100).transform(v => v.toLowerCase()), address: z.string().trim().max(240),
  capacity: z.number().int().min(0).max(100000),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  radiusKm: z.number().int().min(1).max(200), emailEnabled: z.boolean(), pushEnabled: z.boolean(),
}).strict().refine(v => (v.latitude === null) === (v.longitude === null), "Provide both coordinates or neither.");

export async function updateSettings(userId: string, input: z.infer<typeof settingsSchema>) {
  return getDb().transaction(async tx => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).for("update");
    if (!profile) throw new Error("Account not found.");
    const [deletion] = await tx.select().from(privacyRequests).where(eq(privacyRequests.userId, userId));
    if (deletion) throw new Error("Cancel your pending deletion request before editing your profile. Completed deletions cannot be edited.");
    const [old] = await tx.select().from(accountSettings).where(eq(accountSettings.userId, userId));
    if ((old?.revision ?? 0) !== input.revision) throw new Error("Settings changed. Refresh before saving.");
    if (profile.role !== "volunteer" && (!input.organizationName || !input.address)) throw new Error("Organization and address are required.");
    if (profile.role === "beneficiary" && input.capacity < 1) throw new Error("Capacity must be at least one.");
    const important = ["organizationName", "phone", "city", "address", "capacity"].some(key => (profile[key as keyof typeof profile] ?? "") !== input[key as keyof typeof input]) || (old?.latitude ?? null) !== input.latitude || (old?.longitude ?? null) !== input.longitude;
    if (important) {
      if (profile.isAdmin) throw new Error("Administrator organization changes require another operator; self-service is disabled.");
      const active = await tx.select({ id: donations.id }).from(donations).leftJoin(claims, eq(claims.donationId, donations.id)).where(and(inArray(donations.status, ["available", "claimed"]), or(eq(donations.supplierUserId, userId), eq(claims.beneficiaryUserId, userId)))).limit(1);
      if (active.length) throw new Error("Finish or cancel active donations and pickups before changing organization details.");
    }
    await tx.update(profiles).set({ displayName: input.displayName, organizationName: input.organizationName || null, phone: input.phone, city: input.city, address: input.address, capacity: input.capacity, ...(important ? { verificationStatus: "pending" as const } : {}) }).where(eq(profiles.id, userId));
    const values = { userId, latitude: input.latitude, longitude: input.longitude, radiusKm: input.radiusKm, emailEnabled: input.emailEnabled, pushEnabled: input.pushEnabled, revision: input.revision + 1 };
    await tx.insert(accountSettings).values(values).onConflictDoUpdate({ target: accountSettings.userId, set: values });
    await tx.insert(auditEvents).values({ actorUserId: userId, action: "profile.updated", targetType: "profile", targetId: userId, metadata: JSON.stringify({ reviewRequired: important }) });
    if (important) await tx.insert(notifications).values({ userId, title: "Profile review required", body: "Your updated organization details have been sent for administrator review.", href: "/account" });
    return { reviewRequired: important };
  });
}
