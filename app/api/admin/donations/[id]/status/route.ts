import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, donations } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";

const transitions: Record<string, Set<string>> = {
  available: new Set(["cancelled", "expired"]),
  claimed: new Set(["collected", "cancelled"]),
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!identity.profile.isAdmin) return noStoreJson({ error: "Administrator access is required." }, { status: 403 });
  const invalidRequest = validateWriteRequest(request);
  if (invalidRequest) return invalidRequest;
  const payload = await request.json() as { status?: string };
  if (!payload.status) return noStoreJson({ error: "Invalid donation status." }, { status: 400 });
  const { id } = await context.params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) return noStoreJson({ error: "Invalid donation." }, { status: 400 });
  try {
    const db = getDb();
    const [current] = await db.select().from(donations).where(eq(donations.id, donationId)).limit(1);
    if (!current) return noStoreJson({ error: "Donation not found." }, { status: 404 });
    if (!transitions[current.status]?.has(payload.status)) return noStoreJson({ error: `A ${current.status} donation cannot be marked ${payload.status}.` }, { status: 409 });
    const [donation] = await db.update(donations).set({ status: payload.status as "available" | "claimed" | "collected" | "cancelled" | "expired" }).where(eq(donations.id, donationId)).returning();
    await db.insert(auditEvents).values({ actorUserId: identity.user.userId, action: `donation.${payload.status}`, targetType: "donation", targetId: String(donationId), metadata: JSON.stringify({ previousStatus: current.status }) });
    return noStoreJson({ donation });
  } catch (error) {
    console.error("Donation status update failed", error);
    return noStoreJson({ error: "Donation update failed." }, { status: 503 });
  }
}
