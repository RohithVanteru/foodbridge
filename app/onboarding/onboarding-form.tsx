"use client";

import { Heart, Home, HandHeart, Store, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const roleOptions = [
  { value: "supplier", title: "Food supplier", description: "Restaurant, banquet hall, food court, or hostel", icon: Store },
  { value: "beneficiary", title: "Beneficiary", description: "Old-age home or orphanage receiving food", icon: Home },
  { value: "volunteer", title: "Volunteer", description: "Help organizations join and coordinate pickups", icon: HandHeart },
];

export default function OnboardingForm({ user }: { user: { displayName: string; email: string } }) {
  const [role, setRole] = useState("supplier");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        role,
        displayName: form.get("displayName"),
        organizationName: form.get("organizationName"),
        phone: form.get("phone"),
        city: form.get("city"),
        address: form.get("address"),
        capacity: form.get("capacity"),
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.administrator ? "/admin" : "/account");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Account setup failed. Please try again.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f6f1] px-5 py-8 text-[#17332f] sm:py-12">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-[#dfe4dc] bg-white shadow-[0_24px_80px_rgba(23,51,47,0.10)] lg:grid-cols-[0.82fr_1.18fr]">
        <section className="flex flex-col justify-between bg-[#153f3a] p-8 text-white sm:p-12">
          <div>
            <div className="flex items-center gap-3"><span className="logo-mark"><Heart className="size-5 fill-current" /></span><span className="font-display text-2xl font-bold">Food<span className="text-[#f28a58]">Bridge</span></span></div>
            <p className="mt-16 text-xs font-bold uppercase tracking-[0.14em] text-[#f6b94b]">Secure account setup</p>
            <h1 className="font-display mt-3 text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">Tell us how you’ll take part.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/70">Your ChatGPT sign-in protects your identity. Organization details are reviewed before food can be listed or claimed.</p>
          </div>
          <div className="mt-12 flex items-start gap-3 rounded-2xl bg-white/8 p-4"><UserRoundCheck className="mt-0.5 size-5 text-[#f6b94b]" /><div><p className="font-semibold">Signed in as {user.displayName}</p><p className="mt-1 text-sm text-white/55">{user.email}</p></div></div>
        </section>
        <form onSubmit={submit} className="p-7 sm:p-12">
          <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">Create your FoodBridge profile</h2>
          <p className="mt-2 text-sm leading-6 text-[#60756f]">Choose one operating role. An administrator can update it later.</p>
          <RadioGroup value={role} onValueChange={setRole} className="mt-7 grid gap-3 sm:grid-cols-3">
            {roleOptions.map(({ value, title, description, icon: Icon }) => (
              <label key={value} className={`cursor-pointer rounded-2xl border p-4 transition ${role === value ? "border-[#d7552d] bg-[#fff4ee] shadow-sm" : "border-[#dfe4dc] hover:border-[#aab9b3]"}`}>
                <div className="flex items-center justify-between"><Icon className="size-5 text-[#d7552d]" /><RadioGroupItem value={value} aria-label={title} /></div>
                <p className="mt-5 font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-[#6b7d78]">{description}</p>
              </label>
            ))}
          </RadioGroup>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="field">Your name<Input required name="displayName" defaultValue={user.displayName} /></label>
            <label className="field">Phone number<Input required name="phone" type="tel" placeholder="+91 98765 43210" /></label>
            {role !== "volunteer" && <label className="field sm:col-span-2">Organization name<Input required name="organizationName" placeholder="Registered organization name" /></label>}
            <label className="field">City<Input required name="city" placeholder="Bengaluru" /></label>
            {role === "beneficiary" && <label className="field">Meal capacity<Input required name="capacity" type="number" min="1" placeholder="80" /></label>}
            {role !== "volunteer" && <label className="field sm:col-span-2">Organization address<Input required name="address" placeholder="Full pickup or delivery address" /></label>}
          </div>
          {error && <p className="mt-5 rounded-xl bg-[#fff0e9] px-4 py-3 text-sm font-semibold text-[#9e3922]" role="alert">{error}</p>}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#e4e8e1] pt-6"><p className="text-xs leading-5 text-[#78908b]">By continuing, you confirm these details are accurate.</p><Button disabled={saving} size="lg" className="rounded-full bg-[#d7552d] px-7 text-white hover:bg-[#be4522]">{saving ? "Creating…" : "Create account"}</Button></div>
        </form>
      </div>
    </main>
  );
}
