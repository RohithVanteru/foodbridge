import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, profiles } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!identity.profile.isAdmin) return noStoreJson({ error: "Administrator access is required." }, { status: 403 });
  const invalidRequest = validateWriteRequest(request);
  if (invalidRequest) return invalidRequest;
  const payload = await request.json() as { status?: string };
  if (payload.status !== "verified" && payload.status !== "rejected") return noStoreJson({ error: "Invalid verification status." }, { status: 400 });
  const { id } = await context.params;
  if (id === identity.user.userId) return noStoreJson({ error: "Administrators cannot change their own verification." }, { status: 400 });
  try {
    const db = getDb();
    const [target] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    if (!target) return noStoreJson({ error: "Account not found." }, { status: 404 });
    if (target.isAdmin) return noStoreJson({ error: "Administrator accounts cannot be changed here." }, { status: 400 });
    if (target.verificationStatus !== "pending") return noStoreJson({ error: "Only pending accounts can be reviewed." }, { status: 409 });
    const [profile] = await db.update(profiles).set({ verificationStatus: payload.status }).where(eq(profiles.id, id)).returning();
    await db.insert(auditEvents).values({ actorUserId: identity.user.userId, action: `profile.${payload.status}`, targetType: "profile", targetId: id, metadata: JSON.stringify({ previousStatus: target.verificationStatus }) });
    return noStoreJson({ profile });
  } catch (error) {
    console.error("Profile verification failed", error);
    return noStoreJson({ error: "Verification update failed." }, { status: 503 });
  }
}
