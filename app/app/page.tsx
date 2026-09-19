import FoodBridgeApp from "../foodbridge-app";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { signOutPath, requireUser } from "@/lib/server/session";
import { canAdminister } from "@/lib/server/security";
import { currentRequestUrl } from "@/lib/server/request-url";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/app");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  if (profile.verificationStatus !== "verified") redirect("/account");
  const isAdmin = canAdminister(profile, user.email, await currentRequestUrl("/app"));
  const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(new Date());
  return <FoodBridgeApp user={{ displayName: user.displayName, email: user.email }} profile={{ role: profile.role, organizationName: profile.organizationName, city: profile.city, verificationStatus: profile.verificationStatus, isAdmin }} signOutPath={signOutPath()} todayLabel={todayLabel} />;
}
