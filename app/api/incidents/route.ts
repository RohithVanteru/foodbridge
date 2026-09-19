import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, incidents, notifications } from "@/db/schema";
import { requireApiAdministrator, requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
import { lockActiveAccount } from "@/lib/server/account-lock";
export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  const identity = admin ? await requireApiAdministrator(request) : await requireApiProfile(); if (identity.error) return identity.error;
  const rows = await getDb().select().from(incidents).where(admin ? undefined : eq(incidents.reporterId, identity.user.userId)).orderBy(desc(incidents.id)).limit(100);
  return noStoreJson({ incidents: admin ? rows : rows.map(({ internalNotes: _private, ...row }) => { void _private; return row; }) });
}
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.object({ category: z.enum(["food_safety", "missed_pickup", "misconduct", "other"]), description: z.string().trim().min(10).max(3000) }).strict());
    const incident = await getDb().transaction(async tx => { await lockActiveAccount(tx, identity.user.userId, false); const [row] = await tx.insert(incidents).values({ ...data, reporterId: identity.user.userId }).returning(); return row; });
    return noStoreJson({ id: incident.id }, { status: 201 });
  } catch { return noStoreJson({ error: "Provide a category and a description of 10–3000 characters." }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, z.object({ id: z.number().int().positive(), revision: z.number().int().nonnegative(), status: z.enum(["open", "investigating", "resolved"]), resolution: z.string().trim().max(2000), internalNotes: z.string().trim().max(3000) }).strict().refine(v => v.status !== "resolved" || v.resolution.length >= 10, "Explain the resolution."));
    await getDb().transaction(async tx => {
      const [old] = await tx.select().from(incidents).where(eq(incidents.id, data.id)).for("update");
      if (!old || old.revision !== data.revision) throw new Error("Case changed. Refresh before saving.");
      await tx.update(incidents).set({ status: data.status, resolution: data.resolution, internalNotes: data.internalNotes, revision: data.revision + 1 }).where(eq(incidents.id, data.id));
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "incident." + data.status, targetType: "incident", targetId: String(data.id) });
      await tx.insert(notifications).values({ userId: old.reporterId, title: "Incident report updated", body: "Check your report for the latest status and response.", href: "/incidents" });
    });
    return noStoreJson({ ok: true });
  } catch { return noStoreJson({ error: "Unable to update. Refresh the case and provide a resolution of at least 10 characters when closing." }, { status: 409 }); }
}
