import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { claims, donations } from "@/db/schema";
import { canUseRole, requireApiProfile } from "@/lib/server/profile";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!canUseRole(identity.profile, "beneficiary")) return Response.json({ error: "A verified beneficiary account is required." }, { status: 403 });
  const { id } = await context.params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) return Response.json({ error: "Invalid donation." }, { status: 400 });
  try {
    const db = getDb();
    const [donation] = await db.select().from(donations).where(and(eq(donations.id, donationId), eq(donations.status, "available"))).limit(1);
    if (!donation) return Response.json({ error: "This donation is no longer available." }, { status: 409 });
    const [claim] = await db.insert(claims).values({ donationId, beneficiaryUserId: identity.user.userId }).returning();
    await db.update(donations).set({ status: "claimed" }).where(eq(donations.id, donationId));
    return Response.json({ claim }, { status: 201 });
  } catch (error) {
    console.error("Accept donation error", error);
    if (String(error).includes("UNIQUE constraint failed")) return Response.json({ error: "This donation was just accepted by another home." }, { status: 409 });
    return Response.json({ error: "We could not reserve this donation. Please refresh and try again." }, { status: 503 });
  }
}
