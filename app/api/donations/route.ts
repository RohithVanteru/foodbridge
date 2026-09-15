import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, donations } from "@/db/schema";
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
    today.setHours(0, 0, 0, 0);
    const rows = await db.select({
      id: donations.id,
      supplierName: donations.supplierName,
      foodDescription: donations.foodDescription,
      servings: donations.servings,
      dietaryNotes: donations.dietaryNotes,
      pickupBy: donations.pickupBy,
      status: donations.status,
      createdAt: donations.createdAt,
    }).from(donations).where(and(eq(donations.status, "available"), gte(donations.pickupBy, today.toISOString()))).orderBy(asc(donations.pickupBy)).limit(50);
    return noStoreJson({ donations: rows.map((row) => ({ ...row, dietaryNotes: JSON.parse(row.dietaryNotes) })) });
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
    const payload = await request.json() as Record<string, unknown>;
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
    if (deadline <= now || deadline.getTime() - now.getTime() > 24 * 60 * 60 * 1000 || deadline.toDateString() !== now.toDateString()) {
      return noStoreJson({ error: "Pickup must be scheduled later today." }, { status: 400 });
    }
    const dietaryNotes = cleanText(payload.dietaryNotes, 500).split(",").map((value) => value.trim()).filter(Boolean).slice(0, 12);
    const db = getDb();
    const [donation] = await db.insert(donations).values({
      supplierUserId: identity.user.userId,
      supplierName,
      foodDescription,
      servings,
      dietaryNotes: JSON.stringify(dietaryNotes),
      pickupAddress,
      pickupBy: deadline.toISOString(),
      instructions: cleanText(payload.instructions, 500),
      safetyConfirmed: true,
    }).returning();
    await db.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "donation.created", targetType: "donation", targetId: String(donation.id), metadata: JSON.stringify({ servings }) });
    return noStoreJson({ donation: { id: donation.id, supplierName: donation.supplierName, foodDescription: donation.foodDescription, servings: donation.servings, dietaryNotes, pickupBy: donation.pickupBy, status: donation.status } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
