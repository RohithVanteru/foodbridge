import { and, asc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { donations } from "@/db/schema";

function apiUser(request: Request) {
  const userId = request.headers.get("oai-authenticated-user-id");
  const email = request.headers.get("oai-authenticated-user-email");
  const isLocal = ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname);
  if (userId && email) return { userId, email };
  if (isLocal) return { userId: "local-preview", email: "preview@shareplate.local" };
  return null;
}

function errorResponse(error: unknown) {
  console.error("Donation API error", error);
  return Response.json({ error: "Donation service is temporarily unavailable. Please try again." }, { status: 503 });
}

export async function GET() {
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
  const user = apiUser(request);
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const foodDescription = String(payload.foodDescription ?? "").trim();
    const supplierName = String(payload.supplierName ?? user.email).trim();
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
      supplierUserId: user.userId,
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
