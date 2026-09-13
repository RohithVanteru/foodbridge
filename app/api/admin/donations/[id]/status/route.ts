import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { donations } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";

const statuses = new Set(["available", "claimed", "collected", "cancelled", "expired"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!identity.profile.isAdmin) return Response.json({ error: "Administrator access is required." }, { status: 403 });
  const payload = await request.json() as { status?: string };
  if (!payload.status || !statuses.has(payload.status)) return Response.json({ error: "Invalid donation status." }, { status: 400 });
  const { id } = await context.params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) return Response.json({ error: "Invalid donation." }, { status: 400 });
  try {
    const db = getDb();
    const [donation] = await db.update(donations).set({ status: payload.status as "available" | "claimed" | "collected" | "cancelled" | "expired" }).where(eq(donations.id, donationId)).returning();
    if (!donation) return Response.json({ error: "Donation not found." }, { status: 404 });
    return Response.json({ donation });
  } catch (error) {
    console.error("Donation status update failed", error);
    return Response.json({ error: "Donation update failed." }, { status: 503 });
  }
}
