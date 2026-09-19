import { requireAdministrator } from "@/lib/server/admin";
import { count, desc, eq } from "drizzle-orm";
import { ArrowRight, Clock3, PackageCheck, ScrollText, Store, Users } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { auditEvents, claims, donations, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdministrator("/admin");
  const db = getDb();
  const [[usersTotal], [pendingTotal], [donationsTotal], [claimsTotal], recentEvents] = await Promise.all([
    db.select({ value: count() }).from(profiles),
    db.select({ value: count() }).from(profiles).where(eq(profiles.verificationStatus, "pending")),
    db.select({ value: count() }).from(donations),
    db.select({ value: count() }).from(claims),
    db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(8),
  ]);
  const metrics = [
    { label: "Registered users", value: usersTotal.value, href: "/admin/users", icon: Users },
    { label: "Pending reviews", value: pendingTotal.value, href: "/admin/users", icon: Clock3 },
    { label: "Food donations", value: donationsTotal.value, href: "/admin/donations", icon: Store },
    { label: "Pickup claims", value: claimsTotal.value, href: "/admin/pickups", icon: PackageCheck },
  ];
  return <><p className="eyebrow">Operations overview</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">Monitor the whole network</h1><p className="mt-2 text-[#60756f]">Use the separate views to review users, donation activity, pickups, security events, and service health.</p><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, href, icon: Icon }) => <Link href={href} key={label} className="rounded-2xl border border-[#dfe4dc] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><Icon className="size-5 text-[#d7552d]" /><p className="font-display mt-5 text-3xl font-bold">{value}</p><div className="mt-1 flex items-center justify-between text-sm text-[#60756f]"><span>{label}</span><ArrowRight className="size-4" /></div></Link>)}</section><section className="mt-8 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white"><div className="flex items-center justify-between border-b border-[#e8ece6] p-5"><div><h2 className="font-display text-xl font-bold">Recent activity</h2><p className="mt-1 text-sm text-[#60756f]">Latest security and operational changes.</p></div><Link href="/admin/audit" className="text-sm font-bold text-[#d7552d]">Full audit log</Link></div><div className="divide-y divide-[#edf0eb]">{recentEvents.length ? recentEvents.map((event) => <div key={event.id} className="flex items-center gap-3 px-5 py-4"><ScrollText className="size-4 text-[#78908b]" /><div className="min-w-0 flex-1"><p className="font-bold">{event.action}</p><p className="truncate text-xs text-[#78908b]">{event.targetType} #{event.targetId}</p></div><time className="text-xs text-[#78908b]">{new Date(event.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>) : <p className="p-8 text-center text-sm text-[#60756f]">No activity has been recorded yet.</p>}</div></section></>;
}
