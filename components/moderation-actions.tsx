"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ModerationActions({ id, kind }: { id: number; kind: "post" | "referral" }) {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  async function update(status: string) {
    setBusy(true);
    try { const r = await fetch("/api/admin/moderate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, type: kind, status }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage("Updated"); router.refresh(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Update failed"); } finally { setBusy(false); }
  }
  return <div className="flex flex-wrap gap-3 mt-3">{(kind === "post" ? ["published", "rejected"] : ["contacted", "onboarded", "closed"]).map(status => <button className="rounded border px-3 py-2 capitalize" disabled={busy} key={status} onClick={() => update(status)}>{status}</button>)}<p role="status">{message}</p></div>;
}
