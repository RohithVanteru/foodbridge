import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { readBody } from "@/lib/server/body";
import { validateWriteRequest, noStoreJson } from "@/lib/server/security";
export async function GET() {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  return noStoreJson({ notifications: await getDb().select().from(notifications).where(eq(notifications.userId, identity.user.userId)).orderBy(desc(notifications.id)).limit(100) });
}
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const { id } = await readBody(request, z.object({ id: z.number().int().positive() }));
    await getDb().update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, identity.user.userId)));
    return noStoreJson({ ok: true });
  } catch { return noStoreJson({ error: "Invalid notification" }, { status: 400 }); }
}
