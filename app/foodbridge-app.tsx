"use client";

import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  LogOut,
  MapPin,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Role = "supplier" | "beneficiary" | "volunteer";

type DonationItem = { id: number; supplier: string; initials: string; food: string; servings: number; distance: string; pickup: string; dietary: string[]; color: string };
type WebMcpContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal: AbortSignal }) => void | Promise<void> };

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="logo-mark" aria-hidden="true"><Heart className="size-5 fill-current" /></span>
      <span className="font-display text-[1.35rem] font-bold tracking-[-0.04em]">Food<span className="text-[#d7552d]">Bridge</span></span>
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false, href }: { icon: typeof Home; label: string; active?: boolean; href?: string }) {
  const content = <><Icon className="size-[1.1rem]" /><span>{label}</span></>;
  return href ? <a href={href} className={`nav-item ${active ? "nav-item-active" : ""}`}>{content}</a> : <button className={`nav-item ${active ? "nav-item-active" : ""}`}>{content}</button>;
}

export default function FoodBridgeApp({ user, profile, signOutPath, todayLabel }: { user: { displayName: string; email: string }; profile: { role: Role; organizationName: string | null; city: string; verificationStatus: "pending" | "verified" | "rejected"; isAdmin: boolean }; signOutPath: string; todayLabel: string }) {
  const role = profile.role;
  const canDonate = role === "supplier" && profile.verificationStatus === "verified";
  const canAccept = role === "beneficiary" && profile.verificationStatus === "verified";
  const initials = user.displayName.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [accepted, setAccepted] = useState<number[]>([]);
  const [created, setCreated] = useState(false);
  const [liveDonations, setLiveDonations] = useState<DonationItem[]>([]);
  const [actionError, setActionError] = useState("");
  const donations = useMemo(() => liveDonations.filter((item) => `${item.supplier} ${item.food}`.toLowerCase().includes(search.toLowerCase())), [liveDonations, search]);
  const totalServings = liveDonations.reduce((total, item) => total + item.servings, 0);

  useEffect(() => {
    fetch("/api/donations")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(({ donations: rows }) => setLiveDonations(rows.map((row: Record<string, unknown>) => {
        const supplier = String(row.supplierName);
        return {
          id: Number(row.id), supplier, initials: supplier.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
          food: String(row.foodDescription), servings: Number(row.servings), distance: "Nearby",
          pickup: `Pick up by ${new Date(String(row.pickupBy)).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
          dietary: Array.isArray(row.dietaryNotes) ? row.dietaryNotes.map(String) : [], color: "bg-[#d7552d]",
        };
      })))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMcpContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const source = liveDonations;
    void Promise.resolve(context.registerTool({
      name: "search_available_food",
      title: "Search available food",
      description: "Filter the visible same-day food donations by supplier or food description.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const query = typeof input === "object" && input !== null && "query" in input ? String(input.query).trim() : "";
        if (!query) throw new Error("query must be a non-empty string");
        setSearch(query);
        return { query, visibleResults: source.filter((item) => `${item.supplier} ${item.food}`.toLowerCase().includes(query.toLowerCase())).length };
      },
    }, { signal: lifecycle.signal })).catch((error) => console.warn("WebMCP search tool unavailable", error));
    void Promise.resolve(context.registerTool({
      name: "start_food_donation",
      title: "Start a food donation",
      description: "Open the FoodBridge form to prepare a same-day surplus food donation. This does not publish it.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute() {
        if (!canDonate) throw new Error("Only verified food suppliers can start a donation.");
        setDialogOpen(true);
        return { status: "form_open", published: false };
      },
    }, { signal: lifecycle.signal })).catch((error) => console.warn("WebMCP donation tool unavailable", error));
    return () => lifecycle.abort();
  }, [canDonate, liveDonations]);

  async function submitDonation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    const form = new FormData(event.currentTarget);
    const pickupTime = String(form.get("pickupBy"));
    const pickupBy = new Date();
    const [hours, minutes] = pickupTime.split(":").map(Number);
    pickupBy.setHours(hours, minutes, 0, 0);
    try {
      const response = await fetch("/api/donations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        supplierName: form.get("supplierName"), foodDescription: form.get("foodDescription"), servings: Number(form.get("servings")),
        pickupBy: pickupBy.toISOString(), pickupAddress: form.get("pickupAddress"), dietaryNotes: form.get("dietaryNotes"), safetyConfirmed: form.get("safetyConfirmed") === "on",
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const row = result.donation;
      const supplier = String(row.supplierName);
      setLiveDonations((current) => [{ id: Number(row.id), supplier, initials: supplier.split(/\s+/).map((word: string) => word[0]).join("").slice(0, 2).toUpperCase(), food: String(row.foodDescription), servings: Number(row.servings), distance: "Your location", pickup: `Pick up by ${pickupBy.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`, dietary: row.dietaryNotes, color: "bg-[#d7552d]" }, ...current]);
      setCreated(true);
      setDialogOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not publish the donation. Please try again.");
    }
  }

  async function acceptDonation(id: number) {
    setActionError("");
    if (id > 0) {
      try {
        const response = await fetch(`/api/donations/${id}/accept`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not reserve this donation.");
        return;
      }
    }
    setAccepted((current) => current.includes(id) ? current : [...current, id]);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f1] text-[#17332f]">
      <header className="sticky top-0 z-30 border-b border-[#dfe4dc] bg-[#f6f6f1]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-2 rounded-full border border-[#dfe4dc] bg-white px-4 py-2 md:flex">
            <MapPin className="size-4 text-[#d7552d]" /><span className="text-sm font-semibold">{profile.city}</span><ChevronRight className="size-4 text-[#78908b]" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full"><Bell className="size-5" /></Button>
            <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-bold">{user.displayName}</p><p className="max-w-40 truncate text-xs text-[#78908b]">{profile.organizationName ?? "Individual volunteer"}</p></div>
            <a href="/account" className="flex size-10 items-center justify-center rounded-full bg-[#153f3a] text-sm font-bold text-white" aria-label={`View account for ${user.displayName}`}>{initials}</a>
            <a href={signOutPath} className="flex size-9 items-center justify-center rounded-full text-[#60756f] hover:bg-[#e8ece6]" aria-label="Sign out"><LogOut className="size-4" /></a>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-72px)] border-r border-[#dfe4dc] px-5 py-8 lg:block">
          <nav className="space-y-1" aria-label="Main navigation">
            <NavItem icon={Home} label="Today" active href="/app" /><NavItem icon={Search} label="Find food" href="/app#available-food" /><NavItem icon={PackageCheck} label="My pickups" href="/pickups" /><NavItem icon={Users} label="Community" href="/app#community" />{profile.isAdmin && <NavItem icon={ShieldCheck} label="Admin console" href="/admin" />}
          </nav>
          <div className="mt-8 border-t border-[#dfe4dc] pt-6">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#78908b]">Your account</p>
            <div className="rounded-xl bg-[#e8ece6] p-3"><p className="text-sm font-bold capitalize">{role === "supplier" ? "Food supplier" : role}</p><p className={`mt-1 text-xs font-semibold capitalize ${profile.verificationStatus === "verified" ? "text-[#26705d]" : "text-[#b06a18]"}`}>{profile.verificationStatus}</p></div>
          </div>
          <div className="mt-8 rounded-2xl bg-[#153f3a] p-4 text-white">
            <ShieldCheck className="mb-5 size-6 text-[#f6b94b]" /><p className="font-display text-lg font-bold">Food safety first</p>
            <p className="mt-1 text-sm leading-5 text-white/70">Only list food stored safely and ready for same-day pickup.</p>
            <button className="mt-4 text-sm font-bold text-[#f6b94b]">View checklist →</button>
          </div>
        </aside>

        <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">{todayLabel}</p>
              <h1 className="font-display mt-2 max-w-2xl text-[clamp(2rem,4vw,3.6rem)] font-bold leading-[0.98] tracking-[-0.055em]">Good food should<br />never go to waste.</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#60756f]">
                {role === "beneficiary" && "Three safe, same-day donations are available near your home."}
                {role === "supplier" && "Share surplus food in minutes and reach verified homes nearby."}
                {role === "volunteer" && "Help trusted organizations join and keep today’s pickups moving."}
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              {role === "supplier" && <DialogTrigger asChild><Button disabled={!canDonate} size="lg" className="h-12 self-start rounded-full bg-[#d7552d] px-6 text-base text-white shadow-[0_10px_30px_rgba(215,85,45,0.22)] hover:bg-[#be4522]"><Plus className="size-5" /> {canDonate ? "Offer surplus food" : "Verification pending"}</Button></DialogTrigger>}
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-0 p-0 sm:max-w-xl">
                <form onSubmit={submitDonation}>
                  <DialogHeader className="border-b border-[#e4e8e1] px-7 py-6"><DialogTitle className="font-display text-2xl">Offer food for today</DialogTitle><DialogDescription>Your listing becomes visible to verified homes immediately.</DialogDescription></DialogHeader>
                  <div className="grid gap-5 px-7 py-6 sm:grid-cols-2">
                    <label className="field sm:col-span-2">Supplier or organization<Input required name="supplierName" defaultValue={profile.organizationName ?? ""} placeholder="e.g. Saffron Table" /></label>
                    <label className="field sm:col-span-2">Food description<Input required name="foodDescription" placeholder="e.g. Vegetable biryani and dal" /></label>
                    <label className="field">Estimated servings<Input required name="servings" type="number" min="1" placeholder="40" /></label>
                    <label className="field">Pickup by<Input required name="pickupBy" type="time" /></label>
                    <label className="field sm:col-span-2">Pickup address<Input required name="pickupAddress" placeholder="Restaurant address" /></label>
                    <label className="field sm:col-span-2">Dietary and pickup notes<Textarea name="dietaryNotes" placeholder="Vegetarian, contains dairy, mild spice…" /></label>
                    <label className="flex items-start gap-3 rounded-xl bg-[#f2f4ef] p-4 text-sm leading-5 text-[#506761] sm:col-span-2"><input required name="safetyConfirmed" type="checkbox" className="mt-1 accent-[#d7552d]" /><span>I confirm this food was prepared and stored safely and will be collected today.</span></label>
                    {actionError && <p className="text-sm font-semibold text-[#b33c27] sm:col-span-2" role="alert">{actionError}</p>}
                  </div>
                  <DialogFooter className="border-t border-[#e4e8e1] px-7 py-5"><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" className="bg-[#d7552d] text-white hover:bg-[#be4522]">Publish donation</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </section>

          {created && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#a9c9bb] bg-[#e5f2eb] px-4 py-3 text-sm font-semibold text-[#1c5f4d]" role="status"><CheckCircle2 className="size-5" /> Your donation is live and visible to verified homes.</div>}
          {actionError && !dialogOpen && <div className="mt-6 rounded-2xl border border-[#e4b7a9] bg-[#fff0e9] px-4 py-3 text-sm font-semibold text-[#9e3922]" role="alert">{actionError}</div>}

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="stat-card stat-card-dark text-white"><span className="stat-icon bg-white/10"><Utensils /></span><p className="stat-value">{totalServings}</p><p className="text-sm text-white/65">servings available nearby</p></article>
            <article className="stat-card"><span className="stat-icon bg-[#fde8dc] text-[#d7552d]"><Clock3 /></span><p className="stat-value">{liveDonations.length}</p><p className="text-sm text-[#6b7d78]">active same-day donations</p></article>
            <article className="stat-card"><span className="stat-icon bg-[#fff0cb] text-[#9a6700]"><Truck /></span><p className="stat-value">{accepted.length}</p><p className="text-sm text-[#6b7d78]">pickups accepted this session</p></article>
          </section>

          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
            <section id="available-food">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-display text-2xl font-bold tracking-[-0.035em]">Available near you</h2><p className="mt-1 text-sm text-[#6b7d78]">Ready for collection today</p></div>
                <label className="relative block"><span className="sr-only">Search food or supplier</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#78908b]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food or supplier" className="h-10 rounded-full bg-white pl-9 sm:w-64" /></label>
              </div>
              <div className="space-y-3">
                {donations.map((donation) => {
                  const isAccepted = accepted.includes(donation.id);
                  return (
                    <article className="donation-card" key={donation.id}>
                      <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${donation.color} font-bold text-white`}>{donation.initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="font-display text-lg font-bold">{donation.food}</h3><span className="rounded-full bg-[#e6f2ec] px-2 py-1 text-xs font-bold text-[#26705d]">Safety checked</span></div>
                        <p className="mt-1 text-sm text-[#6b7d78]">{donation.supplier} · {donation.distance}</p>
                        <div className="mt-3 flex flex-wrap gap-2"><span className="detail-chip"><Users /> {donation.servings} servings</span><span className="detail-chip text-[#b94725]"><Clock3 /> {donation.pickup}</span>{donation.dietary.map((item) => <span className="detail-chip" key={item}>{item}</span>)}</div>
                      </div>
                      <Button onClick={() => acceptDonation(donation.id)} disabled={!canAccept || isAccepted} variant={isAccepted ? "secondary" : "outline"} className="h-10 rounded-full px-4">{isAccepted ? <><CheckCircle2 /> Accepted</> : canAccept ? <>View & accept <ArrowRight /></> : <>Beneficiaries only</>}</Button>
                    </article>
                  );
                })}
                {donations.length === 0 && <div className="rounded-2xl border border-dashed border-[#cbd4cb] p-8 text-center text-[#6b7d78]">No donations match that search.</div>}
              </div>
            </section>

            <aside id="community">
              <div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-2xl font-bold tracking-[-0.035em]">Community</h2><p className="mt-1 text-sm text-[#6b7d78]">Impact, shared openly</p></div><button className="text-sm font-bold text-[#d7552d]">View feed</button></div>
              <article className="rounded-3xl border border-dashed border-[#cbd4cb] bg-white p-8 text-center"><Sparkles className="mx-auto size-8 text-[#d7552d]" /><p className="font-display mt-4 text-xl font-bold">No community updates yet</p><p className="mt-2 text-sm leading-6 text-[#60756f]">Completed pickups can be shared here after photo consent and moderation are enabled.</p></article>
            </aside>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-[#dfe4dc] bg-white/95 p-2 shadow-xl backdrop-blur lg:hidden" aria-label="Mobile navigation">
        <NavItem icon={Home} label="Today" active href="/app" /><NavItem icon={Search} label="Find" href="/app#available-food" />{canDonate && <Button onClick={() => setDialogOpen(true)} size="icon" className="size-12 rounded-full bg-[#d7552d] text-white" aria-label="Offer surplus food"><Plus /></Button>}<NavItem icon={PackageCheck} label="Pickups" href="/pickups" /><NavItem icon={Users} label="Feed" href="/app#community" />
      </nav>
    </div>
  );
}
