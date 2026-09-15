import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, claims, donations } from "@/db/schema";
import { canUseRole, requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateSameOrigin } from "@/lib/server/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!canUseRole(identity.profile, "beneficiary")) return noStoreJson({ error: "A verified beneficiary account is required." }, { status: 403 });
  const invalidRequest = validateSameOrigin(request);
  if (invalidRequest) return invalidRequest;
  const { id } = await context.params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) return noStoreJson({ error: "Invalid donation." }, { status: 400 });
  try {
    const db = getDb();
    const [donation] = await db.select().from(donations).where(and(eq(donations.id, donationId), eq(donations.status, "available"))).limit(1);
    if (!donation || new Date(donation.pickupBy) <= new Date()) return noStoreJson({ error: "This donation is no longer available." }, { status: 409 });
    const [claim] = await db.insert(claims).values({ donationId, beneficiaryUserId: identity.user.userId }).returning();
    await db.update(donations).set({ status: "claimed" }).where(eq(donations.id, donationId));
    await db.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "donation.claimed", targetType: "donation", targetId: String(donationId), metadata: JSON.stringify({ claimId: claim.id }) });
    return noStoreJson({ claim }, { status: 201 });
  } catch (error) {
    console.error("Accept donation error", error);
    if (String(error).includes("UNIQUE constraint failed")) return noStoreJson({ error: "This donation was just accepted by another home." }, { status: 409 });
    return noStoreJson({ error: "We could not reserve this donation. Please refresh and try again." }, { status: 503 });
  }
}
