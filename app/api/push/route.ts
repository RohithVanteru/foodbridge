import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
import { subscriptionSchema } from "@/lib/server/push";
import { lockActiveAccount } from "@/lib/server/account-lock";
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const data = await readBody(request, subscriptionSchema);
    const saved = await getDb().transaction(async tx => { await lockActiveAccount(tx, identity.user.userId, false); const [row] = await tx.insert(pushSubscriptions).values({ userId: identity.user.userId, endpoint: data.endpoint, ...data.keys }).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: data.keys, setWhere: eq(pushSubscriptions.userId, identity.user.userId) }).returning({ id: pushSubscriptions.id }); return row; });
    if (!saved) return noStoreJson({ error: "This browser subscription belongs to another account. Disable it in that account first." }, { status: 409 });
    return noStoreJson({ ok: true });
  } catch { return noStoreJson({ error: "Invalid or unsupported browser push subscription." }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  const data = await readBody(request, subscriptionSchema.pick({ endpoint: true }));
  await getDb().delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, data.endpoint), eq(pushSubscriptions.userId, identity.user.userId)));
  return noStoreJson({ ok: true });
}
