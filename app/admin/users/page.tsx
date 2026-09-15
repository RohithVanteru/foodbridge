import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { VerificationActions } from "../admin-actions";

export const dynamic = "force-dynamic";

export default async function UsersMonitorPage() {
  const users = await getDb().select().from(profiles).orderBy(desc(profiles.createdAt)).limit(100);
  return <><p className="eyebrow">Identity and trust</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-.05em]">Users</h1><p className="mt-2 text-[#60756f]">Monitor every registered supplier, beneficiary, volunteer, and administrator.</p><section className="mt-7 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">{users.length ? <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Organization</TableHead><TableHead>City</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Review</TableHead></TableRow></TableHeader><TableBody>{users.map((profile) => <TableRow key={profile.id}><TableCell><p className="font-bold">{profile.displayName}</p><p className="text-xs text-[#78908b]">{profile.email}</p></TableCell><TableCell><Badge variant="secondary" className="capitalize">{profile.role}</Badge></TableCell><TableCell>{profile.organizationName ?? "—"}</TableCell><TableCell>{profile.city}</TableCell><TableCell><Badge variant="outline" className="capitalize">{profile.verificationStatus}</Badge></TableCell><TableCell>{profile.verificationStatus === "pending" && !profile.isAdmin ? <VerificationActions id={profile.id} /> : <p className="text-right text-xs text-[#78908b]">No action</p>}</TableCell></TableRow>)}</TableBody></Table> : <p className="p-10 text-center text-[#60756f]">No users have registered.</p>}</section></>;
}
