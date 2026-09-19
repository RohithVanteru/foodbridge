import Link from "next/link";
import { IncidentManager } from "@/components/incident-manager";
import { requireUser } from "@/lib/server/session";
export const dynamic = "force-dynamic";
export default async function Page() { await requireUser("/incidents"); return <main className="mx-auto max-w-3xl p-6"><Link href="/app">← Dashboard</Link><div className="mt-6"><IncidentManager /></div></main>; }
