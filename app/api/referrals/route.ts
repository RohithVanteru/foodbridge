import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, referrals } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { readBody } from "@/lib/server/body";
import { lockActiveAccount } from "@/lib/server/account-lock";
import { validateWriteRequest, noStoreJson } from "@/lib/server/security";
export async function GET() {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  return noStoreJson({ referrals: await getDb().select().from(referrals).where(eq(referrals.volunteerId, identity.user.userId)).orderBy(desc(referrals.id)).limit(100) });
}
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  if (identity.profile.role !== "volunteer" || identity.profile.verificationStatus !== "verified") return noStoreJson({ error: "Verified volunteer required." }, { status: 403 });
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.object({ organizationName: z.string().trim().min(2).max(160), city: z.string().trim().min(2).max(100), contact: z.string().trim().min(5).max(160), notes: z.string().max(1000) }));
    await getDb().transaction(async tx => {
      await lockActiveAccount(tx, identity.user.userId);
      const [referral] = await tx.insert(referrals).values({ ...data, volunteerId: identity.user.userId }).returning();
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "referral.created", targetType: "referral", targetId: String(referral.id) });
    });
    return noStoreJson({ message: "Referral sent to administrators." }, { status: 201 });
  } catch { return noStoreJson({ error: "Complete the required referral details." }, { status: 400 }); }
}
