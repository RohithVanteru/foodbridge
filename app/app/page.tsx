import FoodBridgeApp from "../foodbridge-app";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { canAdminister } from "@/lib/server/security";
import { currentRequestUrl } from "@/lib/server/request-url";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/app");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  if (profile.verificationStatus !== "verified") redirect("/account");
  const isAdmin = canAdminister(profile, user.email, await currentRequestUrl("/app"));
  return <FoodBridgeApp user={{ displayName: user.displayName, email: user.email }} profile={{ role: profile.role, organizationName: profile.organizationName, city: profile.city, verificationStatus: profile.verificationStatus, isAdmin }} signOutPath={chatGPTSignOutPath("/")} />;
}
