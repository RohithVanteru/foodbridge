import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { donations } from "@/db/schema";
import { canUseRole, requireApiProfile } from "@/lib/server/profile";

function errorResponse(error: unknown) {
  console.error("Donation API error", error);
  return Response.json({ error: "Donation service is temporarily unavailable. Please try again." }, { status: 503 });
}

export async function GET() {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  try {
    const db = getDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows = await db.select().from(donations).where(and(eq(donations.status, "available"), gte(donations.pickupBy, today.toISOString()))).orderBy(asc(donations.pickupBy)).limit(50);
    return Response.json({ donations: rows.map((row) => ({ ...row, dietaryNotes: JSON.parse(row.dietaryNotes) })) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!canUseRole(identity.profile, "supplier")) return Response.json({ error: "A verified food-supplier account is required." }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const foodDescription = String(payload.foodDescription ?? "").trim();
    const supplierName = identity.profile.organizationName?.trim() || identity.user.email;
    const pickupAddress = String(payload.pickupAddress ?? "").trim();
    const pickupBy = String(payload.pickupBy ?? "");
    const servings = Number(payload.servings);
    const safetyConfirmed = payload.safetyConfirmed === true;
    if (!foodDescription || !pickupAddress || !pickupBy || !Number.isInteger(servings) || servings < 1 || !safetyConfirmed) {
      return Response.json({ error: "Complete all required food-safety and pickup details." }, { status: 400 });
    }
    if (new Date(pickupBy).toDateString() !== new Date().toDateString()) {
      return Response.json({ error: "Pickup must be scheduled for today." }, { status: 400 });
    }
    const db = getDb();
    const [donation] = await db.insert(donations).values({
      supplierUserId: identity.user.userId,
      supplierName,
      foodDescription,
      servings,
      dietaryNotes: JSON.stringify(String(payload.dietaryNotes ?? "").split(",").map((value) => value.trim()).filter(Boolean)),
      pickupAddress,
      pickupBy: new Date(pickupBy).toISOString(),
      instructions: String(payload.instructions ?? "").trim(),
      safetyConfirmed: true,
    }).returning();
    return Response.json({ donation: { ...donation, dietaryNotes: JSON.parse(donation.dietaryNotes) } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
