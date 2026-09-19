import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/server/session";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (profile) redirect("/app");
  return <OnboardingForm user={{ displayName: user.displayName, email: user.email }} />;
}
