import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getUser } from "@/lib/server/session";
import { canAdminister, noStoreJson } from "@/lib/server/security";

export async function getCurrentIdentity() {
  const user = await getUser();
  if (!user) return { user: null, profile: null };
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  return { user, profile: profile ?? null };
}

export async function requireApiProfile() {
  const identity = await getCurrentIdentity();
  if (!identity.user) return { error: noStoreJson({ error: "Sign in is required." }, { status: 401 }) } as const;
  if (!identity.profile) return { error: noStoreJson({ error: "Complete your account setup first." }, { status: 403 }) } as const;
  return { ...identity, error: null } as const;
}

export async function requireApiAdministrator(request: Request) {
  const identity = await requireApiProfile();
  if (identity.error) return identity;
  if (!canAdminister(identity.profile, identity.user.email, request.url)) {
    return { error: noStoreJson({ error: "Administrator access is required." }, { status: 403 }) } as const;
  }
  return identity;
}

export function canUseRole(profile: { role: string; verificationStatus: string }, role: "supplier" | "beneficiary") {
  return profile.role === role && profile.verificationStatus === "verified";
}
