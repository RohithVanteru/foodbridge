import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accountSettings } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
import { settingsSchema, updateSettings } from "@/lib/server/account-features";
export async function GET() {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const [settings] = await getDb().select().from(accountSettings).where(eq(accountSettings.userId, identity.user.userId));
  return noStoreJson({ profile: identity.profile, settings: settings ?? { latitude: null, longitude: null, radiusKm: 25, emailEnabled: false, pushEnabled: false, revision: 0 }, pushPublicKey: process.env.VAPID_PUBLIC_KEY ?? null });
}
export async function PATCH(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try { return noStoreJson(await updateSettings(identity.user.userId, await readBody(request, settingsSchema))); }
  catch (error) { return noStoreJson({ error: error instanceof Error && !('code' in error) ? error.message : "Unable to save settings." }, { status: 400 }); }
}
