import FoodBridgeApp from "../foodbridge-app";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/app");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  return <FoodBridgeApp user={{ displayName: user.displayName, email: user.email }} profile={{ role: profile.role, organizationName: profile.organizationName, city: profile.city, verificationStatus: profile.verificationStatus, isAdmin: profile.isAdmin }} signOutPath={chatGPTSignOutPath("/")} />;
}
