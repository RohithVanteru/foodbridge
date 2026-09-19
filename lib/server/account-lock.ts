import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles, privacyRequests } from "@/db/schema";
type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
export async function lockActiveAccount(tx: Transaction, userId: string, verified = true) {
  const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).for("update");
  const [request] = await tx.select().from(privacyRequests).where(eq(privacyRequests.userId, userId));
  if (!profile || request || (verified && profile.verificationStatus !== "verified")) throw new Error("Account is unavailable for new activity.");
  return profile;
}
