import { DonationActions } from "@/app/admin/admin-actions";
import { desc, eq } from "drizzle-orm";
import { ChevronLeft, Clock3, Heart, MapPin, PackageCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/session";
import { getDb } from "@/db";
import { claims, donations, profiles } from "@/db/schema";

export const dynamic = "force-dynamic";

type Pickup = { id: number; foodDescription: string; supplierName: string; servings: number; pickupBy: string; pickupAddress: string; status: string };

export default async function PickupsPage() {
  const user = await requireUser("/pickups");
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
  if (!profile) redirect("/onboarding");
  if (profile.verificationStatus !== "verified") redirect("/account");

  let pickups: Pickup[] = [];
  if (profile.role === "supplier") {
    pickups = await db.select({ id: donations.id, foodDescription: donations.foodDescription, supplierName: donations.supplierName, servings: donations.servings, pickupBy: donations.pickupBy, pickupAddress: donations.pickupAddress, status: donations.status }).from(donations).where(eq(donations.supplierUserId, user.userId)).orderBy(desc(donations.createdAt)).limit(50);
  } else if (profile.role === "beneficiary") {
    pickups = await db.select({ id: donations.id, foodDescription: donations.foodDescription, supplierName: donations.supplierName, servings: donations.servings, pickupBy: donations.pickupBy, pickupAddress: donations.pickupAddress, status: donations.status }).from(claims).innerJoin(donations, eq(claims.donationId, donations.id)).where(eq(claims.beneficiaryUserId, user.userId)).orderBy(desc(claims.acceptedAt)).limit(50);
  }

  const contacts = new Map<number, string>();
  for (const pickup of pickups) {
    const [d] = await db.select().from(donations).where(eq(donations.id, pickup.id));
    const [c] = await db.select().from(claims).where(eq(claims.donationId, pickup.id));
    const otherId = profile.role === "supplier" ? c?.beneficiaryUserId : d.supplierUserId;
    const [other] = otherId ? await db.select().from(profiles).where(eq(profiles.id, otherId)) : [];
    contacts.set(pickup.id, [other?.organizationName, other?.phone, d.instructions].filter(Boolean).join(" · "));
  }
  return <main className="min-h-screen bg-[#f6f6f1] px-5 py-8 text-[#17332f]"><div className="mx-auto max-w-5xl"><a href="/app" className="inline-flex items-center gap-2 text-sm font-bold text-[#60756f]"><ChevronLeft className="size-4" /> Back to dashboard</a><div className="mt-7 flex items-center gap-3"><span className="logo-mark"><Heart className="size-5 fill-current" /></span><div><p className="eyebrow">FoodBridge operations</p><h1 className="font-display text-4xl font-bold tracking-[-.05em]">My pickups</h1></div></div><p className="mt-4 max-w-2xl leading-7 text-[#60756f]">Only you, the matched organization, and administrators can see these pickup details.</p><section className="mt-8 space-y-4">{pickups.length ? pickups.map((pickup) => <article key={pickup.id} className="rounded-2xl border border-[#dfe4dc] bg-white p-5 sm:flex sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><PackageCheck className="size-5 text-[#d7552d]" /><h2 className="font-display text-xl font-bold">{pickup.foodDescription}</h2></div><p className="mt-2 text-sm text-[#60756f]">{pickup.supplierName} · {pickup.servings} servings</p><p className="mt-2 text-sm">{contacts.get(pickup.id)}</p><div className="mt-4 flex flex-wrap gap-3 text-sm"><span className="detail-chip"><Clock3 /> {new Date(pickup.pickupBy).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span><span className="detail-chip"><MapPin /> {pickup.pickupAddress}</span></div></div><span className="mt-4 inline-flex rounded-full bg-[#e8ece6] px-3 py-1.5 text-xs font-bold capitalize sm:mt-0">{pickup.status}</span><DonationActions participant id={pickup.id} status={pickup.status} /></article>) : <div className="rounded-2xl border border-dashed border-[#cbd4cb] bg-white p-10 text-center"><PackageCheck className="mx-auto size-8 text-[#9aada6]" /><p className="mt-3 font-bold">No pickup activity yet</p><p className="mt-1 text-sm text-[#60756f]">Accepted donations and supplier listings will appear here.</p></div>}</section></div></main>;
}
