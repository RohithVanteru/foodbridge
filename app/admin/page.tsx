import { count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { claims, donations, profiles } from "@/db/schema";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  if (!profile.isAdmin) redirect("/");

  const [[usersTotal], [pendingTotal], [donationsTotal], [claimsTotal], pendingProfiles, recentDonations] = await Promise.all([
    db.select({ value: count() }).from(profiles),
    db.select({ value: count() }).from(profiles).where(eq(profiles.verificationStatus, "pending")),
    db.select({ value: count() }).from(donations),
    db.select({ value: count() }).from(claims),
    db.select().from(profiles).where(eq(profiles.verificationStatus, "pending")).orderBy(desc(profiles.createdAt)).limit(25),
    db.select().from(donations).orderBy(desc(donations.createdAt)).limit(25),
  ]);

  return <AdminDashboard user={{ displayName: user.displayName, email: user.email }} signOutPath={chatGPTSignOutPath("/")} metrics={{ users: usersTotal.value, pending: pendingTotal.value, donations: donationsTotal.value, claims: claimsTotal.value }} initialProfiles={pendingProfiles} initialDonations={recentDonations} />;
}
