import { sql } from "drizzle-orm";
import { BadgeCheck, Database, KeyRound, Server, ShieldCheck } from "lucide-react";
import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export default async function SystemMonitorPage() {
  let databaseReady = false;
  try {
    await getDb().run(sql`select 1`);
    databaseReady = true;
  } catch (error) {
    console.error("Admin system check failed", error);
  }
  const checks = [
    { label: "Application runtime", detail: "Cloudflare Worker is responding", ready: true, icon: Server },
    { label: "D1 database", detail: databaseReady ? "Connection is healthy" : "Connection check failed", ready: databaseReady, icon: Database },
    { label: "Authentication", detail: "Platform-managed identity is enforced", ready: true, icon: KeyRound },
    { label: "Admin authorization", detail: "Role and configured identity are both required", ready: true, icon: ShieldCheck },
  ];
  return <><p className="eyebrow">Service readiness</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">System</h1><p className="mt-2 text-[#60756f]">Monitor the core services that keep FoodBridge available and protected.</p><section className="mt-7 grid gap-4 sm:grid-cols-2">{checks.map(({ label, detail, ready, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><div className="flex items-center justify-between"><span className={`flex size-10 items-center justify-center rounded-xl ${ready ? "bg-[#e5f2eb] text-[#26705d]" : "bg-[#fff0e9] text-[#b33c27]"}`}><Icon className="size-5" /></span><span className={`flex items-center gap-1 text-xs font-bold ${ready ? "text-[#26705d]" : "text-[#b33c27]"}`}><BadgeCheck className="size-4" /> {ready ? "Operational" : "Needs attention"}</span></div><h2 className="font-display mt-5 text-xl font-bold">{label}</h2><p className="mt-1 text-sm text-[#60756f]">{detail}</p></article>)}</section><div className="mt-8 rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="font-display text-xl font-bold">Monitoring notes</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#60756f]">This view checks application and database readiness at request time. Use the audit log for operational changes and the Sites analytics view for traffic and page-view trends.</p></div></>;
}
