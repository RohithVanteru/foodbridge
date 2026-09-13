import SharePlateApp from "./shareplate-app";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");

  return <SharePlateApp user={{ displayName: user.displayName, email: user.email }} profile={{ role: profile.role, organizationName: profile.organizationName, verificationStatus: profile.verificationStatus, isAdmin: profile.isAdmin }} signOutPath={chatGPTSignOutPath("/")} />;
}
