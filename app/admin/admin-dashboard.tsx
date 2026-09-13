"use client";

import { Check, ChevronLeft, Clock3, Heart, LogOut, PackageCheck, ShieldCheck, Store, Users, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PendingProfile = { id: string; displayName: string | null; email: string; role: string; organizationName: string | null; city: string; phone: string; createdAt: string; verificationStatus: string };
type Donation = { id: number; supplierName: string; foodDescription: string; servings: number; pickupBy: string; status: string; createdAt: string };

export default function AdminDashboard({ user, signOutPath, metrics, initialProfiles, initialDonations }: { user: { displayName: string; email: string }; signOutPath: string; metrics: { users: number; pending: number; donations: number; claims: number }; initialProfiles: PendingProfile[]; initialDonations: Donation[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [donations, setDonations] = useState(initialDonations);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function verify(id: string, status: "verified" | "rejected") {
    setBusy(id); setMessage("");
    try {
      const response = await fetch(`/api/admin/profiles/${encodeURIComponent(id)}/verification`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProfiles((current) => current.filter((profile) => profile.id !== id));
      setMessage(status === "verified" ? "Organization verified." : "Application rejected.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); } finally { setBusy(""); }
  }

  async function updateDonation(id: number, status: "collected" | "cancelled") {
    setBusy(`donation-${id}`); setMessage("");
    try {
      const response = await fetch(`/api/admin/donations/${id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDonations((current) => current.map((donation) => donation.id === id ? { ...donation, status } : donation));
      setMessage(`Donation marked ${status}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); } finally { setBusy(""); }
  }

  return (
    <div className="min-h-screen bg-[#f6f6f1] text-[#17332f]">
      <header className="border-b border-[#dfe4dc] bg-white"><div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-8"><div className="flex items-center gap-3"><span className="logo-mark"><Heart className="size-5 fill-current" /></span><div><p className="font-display text-xl font-bold">SharePlate Admin</p><p className="text-xs text-[#78908b]">Trust & operations console</p></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user.displayName}</p><p className="text-xs text-[#78908b]">{user.email}</p></div><a href={signOutPath} className="flex size-9 items-center justify-center rounded-full hover:bg-[#edf0eb]" aria-label="Sign out"><LogOut className="size-4" /></a></div></div></header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#60756f] hover:text-[#17332f]"><ChevronLeft className="size-4" /> Back to app</a>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">Administrator access</p><h1 className="font-display mt-2 text-4xl font-bold tracking-[-0.05em]">Operations overview</h1><p className="mt-2 text-[#60756f]">Review accounts and keep today’s food transfers trustworthy.</p></div><Badge className="bg-[#153f3a] px-3 py-1.5"><ShieldCheck /> Server-verified admin</Badge></div>
        {message && <p className="mt-5 rounded-xl border border-[#c7d8cf] bg-white px-4 py-3 text-sm font-semibold" role="status">{message}</p>}
        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[{ label: "Registered users", value: metrics.users, icon: Users }, { label: "Pending verification", value: profiles.length, icon: Clock3 }, { label: "Food donations", value: metrics.donations, icon: Store }, { label: "Accepted pickups", value: metrics.claims, icon: PackageCheck }].map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><Icon className="size-5 text-[#d7552d]" /><p className="font-display mt-5 text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-[#60756f]">{label}</p></article>)}
        </section>
        <Tabs defaultValue="accounts" className="mt-8">
          <TabsList className="bg-[#e4e9e3]"><TabsTrigger value="accounts">Organization verification</TabsTrigger><TabsTrigger value="donations">Donation operations</TabsTrigger></TabsList>
          <TabsContent value="accounts" className="mt-4 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">
            <div className="border-b border-[#e8ece6] p-5"><h2 className="font-display text-xl font-bold">Pending accounts</h2><p className="mt-1 text-sm text-[#60756f]">Confirm registration details offline before approving access.</p></div>
            {profiles.length ? <Table><TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Role</TableHead><TableHead>City</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader><TableBody>{profiles.map((profile) => <TableRow key={profile.id}><TableCell><p className="font-bold">{profile.organizationName ?? profile.displayName}</p><p className="text-xs text-[#78908b]">{profile.email}</p></TableCell><TableCell><Badge variant="secondary" className="capitalize">{profile.role}</Badge></TableCell><TableCell>{profile.city}</TableCell><TableCell>{profile.phone}</TableCell><TableCell><div className="flex justify-end gap-2"><Button disabled={busy === profile.id} onClick={() => verify(profile.id, "rejected")} size="sm" variant="outline"><X /> Reject</Button><Button disabled={busy === profile.id} onClick={() => verify(profile.id, "verified")} size="sm" className="bg-[#26705d] text-white"><Check /> Verify</Button></div></TableCell></TableRow>)}</TableBody></Table> : <div className="p-10 text-center text-[#60756f]"><ShieldCheck className="mx-auto mb-3 size-8 text-[#7ea594]" /><p className="font-bold text-[#17332f]">Verification queue is clear</p><p className="mt-1 text-sm">New organization applications will appear here.</p></div>}
          </TabsContent>
          <TabsContent value="donations" className="mt-4 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white">
            <div className="border-b border-[#e8ece6] p-5"><h2 className="font-display text-xl font-bold">Recent donations</h2><p className="mt-1 text-sm text-[#60756f]">Monitor status and resolve exceptional cases.</p></div>
            {donations.length ? <Table><TableHeader><TableRow><TableHead>Donation</TableHead><TableHead>Supplier</TableHead><TableHead>Pickup deadline</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{donations.map((donation) => <TableRow key={donation.id}><TableCell><p className="font-bold">{donation.foodDescription}</p><p className="text-xs text-[#78908b]">{donation.servings} servings</p></TableCell><TableCell>{donation.supplierName}</TableCell><TableCell>{new Date(donation.pickupBy).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</TableCell><TableCell><Badge variant="outline" className="capitalize">{donation.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-2"><AlertDialog><AlertDialogTrigger asChild><Button disabled={busy === `donation-${donation.id}` || donation.status === "cancelled"} size="sm" variant="outline">Cancel</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel this donation?</AlertDialogTitle><AlertDialogDescription>This removes it from active matching. Only cancel when the supplier confirms the food is no longer available.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep donation</AlertDialogCancel><AlertDialogAction onClick={() => updateDonation(donation.id, "cancelled")} className="bg-destructive text-white">Cancel donation</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button disabled={busy === `donation-${donation.id}` || donation.status === "collected"} onClick={() => updateDonation(donation.id, "collected")} size="sm">Collected</Button></div></TableCell></TableRow>)}</TableBody></Table> : <div className="p-10 text-center text-[#60756f]">No donations have been created yet.</div>}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
