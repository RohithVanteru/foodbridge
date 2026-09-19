"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export default function LogoutPage() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <main className="mx-auto max-w-md p-8"><h1 className="text-2xl font-bold">Sign out of FoodBridge?</h1><button className="mt-6 rounded-xl bg-[#153f3a] px-6 py-3 text-white" disabled={busy} onClick={async () => { setBusy(true); try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.replace("/login"); router.refresh(); } catch { setError("Sign out failed. Please try again."); setBusy(false); } }}>{busy ? "Signing out…" : "Sign out"}</button><a href="/app" className="ml-4">Cancel</a>{error && <p role="alert">{error}</p>}</main>;
}
