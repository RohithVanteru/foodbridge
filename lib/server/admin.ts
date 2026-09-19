import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { currentRequestUrl } from "@/lib/server/request-url";
import { canAdminister } from "@/lib/server/security";

export async function requireAdministrator(returnTo: string) {
  const user = await requireUser(returnTo);
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  if (!canAdminister(profile, user.email, await currentRequestUrl(returnTo))) redirect("/app");
  return { user, profile };
}
