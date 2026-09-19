import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, profiles, notifications } from "@/db/schema";
import { requireApiAdministrator } from "@/lib/server/profile";
import { readBody } from "@/lib/server/body";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const { status } = await readBody(request, z.object({ status: z.enum(["verified", "rejected"]) }));
    const { id } = await context.params;
    if (id === identity.user.userId) return noStoreJson({ error: "Cannot change your own verification." }, { status: 400 });
    const profile = await getDb().transaction(async tx => {
      const [target] = await tx.select().from(profiles).where(eq(profiles.id, id)).for("update");
      if (!target || target.isAdmin) throw new Error("Account cannot be changed.");
      const [updated] = await tx.update(profiles).set({ verificationStatus: status }).where(eq(profiles.id, id)).returning();
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "profile." + status, targetType: "profile", targetId: id, metadata: JSON.stringify({ previousStatus: target.verificationStatus }) });
      await tx.insert(notifications).values({ userId: id, title: "Account review updated", body: "Your account is " + status + ".", href: "/account" });
      return updated;
    });
    return noStoreJson({ profile });
  } catch { return noStoreJson({ error: "Invalid account review request." }, { status: 400 }); }
}
