import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { requireAdministrator } from "@/lib/server/admin";
import { getDb } from "@/db";
import { accountSettings, profiles } from "@/db/schema";
import { VerificationActions } from "../admin-actions";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdministrator("/admin/organization-review");
  const page = Math.max(1, Math.min(100000, Math.floor(Number((await searchParams).page) || 1)));
  const rows = await getDb().select({ profile: profiles, settings: accountSettings }).from(profiles).leftJoin(accountSettings, eq(accountSettings.userId, profiles.id)).where(eq(profiles.verificationStatus, "pending")).orderBy(asc(profiles.createdAt)).limit(25).offset((page - 1) * 25);
  return <section className="grid gap-5"><h1 className="text-3xl font-bold">Organization review</h1><p>Check identity, contact details, capacity and location with the organization before approving. This queue includes new registrations and important profile edits.</p>{rows.map(({ profile: p, settings: s }) => <article key={p.id} className="grid gap-2 rounded border bg-white p-5"><h2 className="text-xl font-bold">{p.organizationName ?? p.displayName}</h2><p>{p.role} · {p.email} · {p.phone}</p><p>{p.address} · {p.city}</p><p>Meal capacity: {p.capacity}</p><p>Coordinates: {s?.latitude ?? "Not set"}, {s?.longitude ?? "Not set"}. Matching radius: {s?.radiusKm ?? 25} km</p><p className="text-sm">Account: {p.id}</p><VerificationActions id={p.id} /></article>)}{!rows.length && <p>No accounts on this page.</p>}<nav className="flex gap-5">{page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}<span>Page {page}</span>{rows.length === 25 && <Link href={`?page=${page + 1}`}>Next</Link>}</nav></section>;
}
