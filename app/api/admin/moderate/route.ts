import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, communityPosts, referrals } from "@/db/schema";
import { requireApiAdministrator } from "@/lib/server/profile";
import { readBody } from "@/lib/server/body";
import { validateWriteRequest, noStoreJson } from "@/lib/server/security";
export async function POST(request: Request) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.discriminatedUnion("type", [
      z.object({ type: z.literal("post"), id: z.number().int().positive(), status: z.enum(["published", "rejected"]) }),
      z.object({ type: z.literal("referral"), id: z.number().int().positive(), status: z.enum(["contacted", "onboarded", "closed"]) }),
    ]));
    await getDb().transaction(async tx => {
      const rows = data.type === "post"
        ? await tx.update(communityPosts).set({ status: data.status }).where(eq(communityPosts.id, data.id)).returning()
        : await tx.update(referrals).set({ status: data.status }).where(eq(referrals.id, data.id)).returning();
      if (!rows.length) throw new Error("Record not found");
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: data.type + "." + data.status, targetType: data.type, targetId: String(data.id) });
    });
    return noStoreJson({ ok: true });
  } catch { return noStoreJson({ error: "Invalid moderation request." }, { status: 400 }); }
}
