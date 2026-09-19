import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { accountSettings, auditEvents, donations, profiles, notifications, privacyRequests } from "@/db/schema";
import { distanceKm, matchesLocation, matchingLocationSQL } from "@/lib/server/location";
import { sameServiceDay } from "@/lib/server/dates";
import { readBody } from "@/lib/server/body";
import { z } from "zod";
import { canUseRole, requireApiProfile } from "@/lib/server/profile";
import { cleanText, noStoreJson, validateWriteRequest } from "@/lib/server/security";

function errorResponse(error: unknown) {
  console.error("Donation API error", error);
  return noStoreJson({ error: "Donation service is temporarily unavailable. Please try again." }, { status: 503 });
}

export async function GET() {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (identity.profile.verificationStatus !== "verified" && !identity.profile.isAdmin) {
    return noStoreJson({ error: "A verified account is required to view available food." }, { status: 403 });
  }
  try {
    const db = getDb();
    const today = new Date();
    const [location] = await db.select().from(accountSettings).where(eq(accountSettings.userId, identity.user.userId));
    const home = { city: identity.profile.city, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, radiusKm: location?.radiusKm };
    const rows = await db.select({
      id: donations.id,
      supplierName: donations.supplierName,
      foodDescription: donations.foodDescription,
      servings: donations.servings,
      dietaryNotes: donations.dietaryNotes,
      pickupBy: donations.pickupBy,
      status: donations.status,
      createdAt: donations.createdAt,
      city: donations.city, latitude: donations.latitude, longitude: donations.longitude,
    }).from(donations).innerJoin(profiles, eq(profiles.id, donations.supplierUserId)).where(and(eq(profiles.verificationStatus, "verified"), eq(donations.status, "available"), matchingLocationSQL(home), identity.profile.role === "beneficiary" ? lte(donations.servings, identity.profile.capacity) : undefined, gte(donations.pickupBy, today.toISOString()))).orderBy(asc(donations.pickupBy)).limit(100);
    return noStoreJson({ donations: rows.filter(row => matchesLocation(home, row) && (identity.profile.role !== "beneficiary" || row.servings <= identity.profile.capacity)).slice(0, 100).map((row) => { const distance = distanceKm(home, row); const { latitude: _lat, longitude: _lng, ...safe } = row; void _lat; void _lng; return { ...safe, distanceKm: distance === null ? null : Math.round(distance * 10) / 10, dietaryNotes: JSON.parse(row.dietaryNotes) }; }) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!canUseRole(identity.profile, "supplier")) return noStoreJson({ error: "A verified food-supplier account is required." }, { status: 403 });
  const invalidRequest = validateWriteRequest(request);
  if (invalidRequest) return invalidRequest;
  try {
    const payload = await readBody(request, z.object({
      foodDescription: z.string().trim().min(2).max(240), pickupAddress: z.string().trim().min(5).max(240),
      pickupBy: z.string().max(40), servings: z.number().int().min(1).max(10000),
      dietaryNotes: z.string().max(500).optional(), instructions: z.string().max(500).optional(),
      safetyConfirmed: z.literal(true),
    }));
    const foodDescription = cleanText(payload.foodDescription, 240);
    const supplierName = identity.profile.organizationName?.trim() || identity.user.email;
    const pickupAddress = cleanText(payload.pickupAddress, 240);
    const pickupBy = cleanText(payload.pickupBy, 40);
    const servings = Number(payload.servings);
    const safetyConfirmed = payload.safetyConfirmed === true;
    const deadline = new Date(pickupBy);
    if (!foodDescription || !pickupAddress || !pickupBy || Number.isNaN(deadline.getTime()) || !Number.isInteger(servings) || servings < 1 || servings > 10_000 || !safetyConfirmed) {
      return noStoreJson({ error: "Complete all required food-safety and pickup details." }, { status: 400 });
    }
    const now = new Date();
    if (deadline <= now || !sameServiceDay(deadline, now)) {
      return noStoreJson({ error: "Pickup must be scheduled later today." }, { status: 400 });
    }
    const dietaryNotes = cleanText(payload.dietaryNotes, 500).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const db = getDb();
    const donation = await db.transaction(async tx => {
    const [fresh] = await tx.select().from(profiles).where(eq(profiles.id, identity.user.userId)).for("update");
    const [deletion] = await tx.select().from(privacyRequests).where(eq(privacyRequests.userId, identity.user.userId));
    if (!fresh || fresh.verificationStatus !== "verified" || deletion?.status === "pending") throw new Error("Account cannot create donations.");
    const [location] = await tx.select().from(accountSettings).where(eq(accountSettings.userId, identity.user.userId));
    const [donation] = await tx.insert(donations).values({
      supplierUserId: identity.user.userId,
      supplierName,
      city: identity.profile.city,
      foodDescription,
      servings,
      dietaryNotes: JSON.stringify(dietaryNotes),
      pickupAddress,
      latitude: pickupAddress === fresh.address ? location?.latitude : null,
      longitude: pickupAddress === fresh.address ? location?.longitude : null,
      pickupBy: deadline.toISOString(),
      instructions: cleanText(payload.instructions, 500),
      safetyConfirmed: true,
    }).returning();
    await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "donation.created", targetType: "donation", targetId: String(donation.id), metadata: JSON.stringify({ servings }) });
    const candidates = await tx.select({ id: profiles.id, city: profiles.city, latitude: accountSettings.latitude, longitude: accountSettings.longitude, radiusKm: accountSettings.radiusKm }).from(profiles).leftJoin(accountSettings, eq(accountSettings.userId, profiles.id)).where(and(eq(profiles.role, "beneficiary"), eq(profiles.verificationStatus, "verified"), gte(profiles.capacity, servings)));
    const recipients = candidates.filter(r => matchesLocation({ ...r, radiusKm: r.radiusKm ?? 25 }, donation));
    if (recipients.length) await tx.insert(notifications).values(recipients.map(r => ({ userId: r.id, title: "Food available nearby", body: supplierName + ": " + foodDescription, href: "/app" })));
    return donation;
    });
    return noStoreJson({ donation: { id: donation.id, supplierName: donation.supplierName, foodDescription: donation.foodDescription, servings: donation.servings, dietaryNotes, pickupBy: donation.pickupBy, status: donation.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return noStoreJson({ error: "Invalid donation details." }, { status: 400 });
    return errorResponse(error);
  }
}
