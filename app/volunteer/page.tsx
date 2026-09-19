"use client";
import { useEffect, useState } from "react";
export default function Page() {
  const [rows, setRows] = useState<{ id: number; organizationName: string; status: string }[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function load() { const r = await fetch("/api/referrals"); const d = await r.json(); if (r.ok) setRows(d.referrals); else setMessage(d.error); }
  useEffect(() => { const timer = setTimeout(() => { void load().catch(() => setMessage("Could not load data. Please refresh.")); }, 0); return () => clearTimeout(timer); }, []);
  return <main className="mx-auto max-w-3xl space-y-6 p-6"><a href="/app">← Dashboard</a><h1 className="text-3xl font-bold">Volunteer onboarding referrals</h1><form className="space-y-4 rounded-2xl border p-5" onSubmit={async e => {
    e.preventDefault(); setBusy(true); const form = e.currentTarget;
    try { const r = await fetch("/api/referrals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }); const d = await r.json(); setMessage(d.message || d.error); if (r.ok) { form.reset(); await load(); } } catch { setMessage("Could not submit referral."); } finally { setBusy(false); }
  }}>{["organizationName", "city", "contact", "notes"].map(name => <label className="field" key={name}>{({ organizationName: "Organization name", city: "City", contact: "Contact phone or email", notes: "Coordination notes" })[name]}<input name={name} required={name !== "notes"} maxLength={name === "notes" ? 1000 : 160} className="rounded border p-3" /></label>)}<button disabled={busy} className="rounded bg-[#153f3a] p-3 text-white">Submit referral</button></form><p role="status">{message}</p>{rows.map(r => <article className="rounded border p-4" key={r.id}>{r.organizationName} · {r.status}</article>)}</main>;
}
