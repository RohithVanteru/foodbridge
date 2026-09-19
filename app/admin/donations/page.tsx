import { requireAdministrator } from "@/lib/server/admin";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { donations } from "@/db/schema";
import { DonationActions } from "../admin-actions";

export const dynamic = "force-dynamic";

export default async function DonationsMonitorPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdministrator("/admin");
  const page = Math.max(1, Math.min(100000, Math.floor(Number((await searchParams).page) || 1)));
  const rows = await getDb().select().from(donations).orderBy(desc(donations.createdAt)).limit(100).offset((page - 1) * 100);
  return <><p className="eyebrow">Food inventory</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">Donations</h1><p className="mt-2 text-[#60756f]">Monitor listings, safety attestations, pickup deadlines, and operational status.</p><section className="mt-7 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">{rows.length ? <Table><TableHeader><TableRow><TableHead>Food</TableHead><TableHead>Supplier</TableHead><TableHead>Servings</TableHead><TableHead>Deadline</TableHead><TableHead>Safety</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{rows.map((donation) => <TableRow key={donation.id}><TableCell><p className="max-w-72 font-bold">{donation.foodDescription}</p><p className="text-xs text-[#78908b]">#{donation.id}</p></TableCell><TableCell>{donation.supplierName}</TableCell><TableCell>{donation.servings}</TableCell><TableCell>{new Date(donation.pickupBy).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell>{donation.safetyConfirmed ? "Confirmed" : "Missing"}</TableCell><TableCell><Badge variant="outline" className="capitalize">{donation.status}</Badge></TableCell><TableCell><DonationActions id={donation.id} status={donation.status} /></TableCell></TableRow>)}</TableBody></Table> : <p className="p-10 text-center text-[#60756f]">No donations have been listed.</p>}</section><nav className="flex gap-5 mt-6">{page > 1 && <a href={`?page=${page-1}`}>Previous</a>}<span>Page {page}</span><a href={`?page=${page+1}`}>Next</a></nav></>;
}
