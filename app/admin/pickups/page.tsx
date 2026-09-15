import { desc, eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { claims, donations, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PickupsMonitorPage() {
  const rows = await getDb().select({ id: claims.id, donationId: claims.donationId, beneficiaryName: profiles.organizationName, beneficiaryEmail: profiles.email, supplierName: donations.supplierName, foodDescription: donations.foodDescription, servings: donations.servings, pickupAddress: donations.pickupAddress, pickupBy: donations.pickupBy, claimStatus: claims.status, donationStatus: donations.status, acceptedAt: claims.acceptedAt }).from(claims).innerJoin(donations, eq(claims.donationId, donations.id)).innerJoin(profiles, eq(claims.beneficiaryUserId, profiles.id)).orderBy(desc(claims.acceptedAt)).limit(100);
  return <><p className="eyebrow">Handoff monitoring</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">Pickups</h1><p className="mt-2 text-[#60756f]">Track each accepted donation from reservation through collection.</p><section className="mt-7 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">{rows.length ? <Table><TableHeader><TableRow><TableHead>Pickup</TableHead><TableHead>Supplier</TableHead><TableHead>Beneficiary</TableHead><TableHead>Address</TableHead><TableHead>Deadline</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-bold">{row.foodDescription}</p><p className="text-xs text-[#78908b]">{row.servings} servings · claim #{row.id}</p></TableCell><TableCell>{row.supplierName}</TableCell><TableCell><p>{row.beneficiaryName ?? "Beneficiary"}</p><p className="text-xs text-[#78908b]">{row.beneficiaryEmail}</p></TableCell><TableCell className="max-w-64">{row.pickupAddress}</TableCell><TableCell>{new Date(row.pickupBy).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell><Badge variant="outline" className="capitalize">{row.donationStatus}</Badge></TableCell></TableRow>)}</TableBody></Table> : <p className="p-10 text-center text-[#60756f]">No pickups have been accepted.</p>}</section></>;
}
