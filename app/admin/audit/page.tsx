import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AuditMonitorPage() {
  const events = await getDb().select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200);
  return <><p className="eyebrow">Security history</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">Audit log</h1><p className="mt-2 text-[#60756f]">Review account decisions and donation lifecycle changes in chronological order.</p><section className="mt-7 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">{events.length ? <Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Event</TableHead><TableHead>Target</TableHead><TableHead>Actor ID</TableHead><TableHead>Context</TableHead></TableRow></TableHeader><TableBody>{events.map((event) => <TableRow key={event.id}><TableCell>{new Date(event.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell><Badge variant="secondary">{event.action}</Badge></TableCell><TableCell>{event.targetType} #{event.targetId}</TableCell><TableCell className="max-w-56 truncate font-mono text-xs">{event.actorUserId}</TableCell><TableCell className="max-w-72 truncate font-mono text-xs text-[#60756f]">{event.metadata}</TableCell></TableRow>)}</TableBody></Table> : <p className="p-10 text-center text-[#60756f]">No audit events have been recorded.</p>}</section></>;
}
