"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function VerificationActions({ id, onComplete }: { id: string; onComplete?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update(status: "verified" | "rejected") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/profiles/${encodeURIComponent(id)}/verification`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(status === "verified" ? "Verified" : "Rejected");
      onComplete?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); } finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center justify-end gap-2"><Button disabled={busy || Boolean(message)} onClick={() => update("rejected")} size="sm" variant="outline"><X /> Reject</Button><Button disabled={busy || Boolean(message)} onClick={() => update("verified")} size="sm" className="bg-[#26705d] text-white"><Check /> Verify</Button>{message && <span className="text-xs font-bold text-[#60756f]">{message}</span>}</div>;
}

export function DonationActions({ id, status, participant = false }: { id: number; status: string; participant?: boolean }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update(next: "collected" | "cancelled") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/${participant ? "" : "admin/"}donations/${id}/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCurrentStatus(next);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed"); } finally { setBusy(false); }
  }
  if (!["available", "claimed"].includes(currentStatus)) return <span className="text-xs font-bold capitalize text-[#60756f]">{currentStatus}</span>;
  return <div className="flex flex-wrap items-center justify-end gap-2"><Button disabled={busy} onClick={() => update("cancelled")} size="sm" variant="outline">Cancel</Button>{currentStatus === "claimed" && <Button disabled={busy} onClick={() => update("collected")} size="sm">Collected</Button>}{message && <span className="text-xs font-bold text-[#b33c27]">{message}</span>}</div>;
}
