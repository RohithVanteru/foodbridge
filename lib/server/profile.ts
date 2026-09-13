import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export async function getCurrentIdentity() {
  const user = await getChatGPTUser();
  if (!user) return { user: null, profile: null };
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  return { user, profile: profile ?? null };
}

export async function requireApiProfile() {
  const identity = await getCurrentIdentity();
  if (!identity.user) return { error: Response.json({ error: "Sign in is required." }, { status: 401 }) } as const;
  if (!identity.profile) return { error: Response.json({ error: "Complete your account setup first." }, { status: 403 }) } as const;
  return { ...identity, error: null } as const;
}

export function canUseRole(profile: { role: string; verificationStatus: string }, role: "supplier" | "beneficiary") {
  return profile.role === role && profile.verificationStatus === "verified";
}
