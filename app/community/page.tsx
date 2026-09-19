import Community from "@/components/community";
export const dynamic = "force-dynamic";
import { requireUser } from "@/lib/server/session";
export default async function Page() { await requireUser("/community"); return <main className="mx-auto max-w-3xl p-6"><a href="/app">← Dashboard</a><Community /></main>; }
