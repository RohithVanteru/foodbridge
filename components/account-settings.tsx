"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Values = { revision: number; displayName: string; organizationName: string; phone: string; city: string; address: string; capacity: number; latitude: number | null; longitude: number | null; radiusKm: number; emailEnabled: boolean; pushEnabled: boolean };
export function AccountSettings() {
  const [values, setValues] = useState<Values | null>(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [pushKey, setPushKey] = useState<string | null>(null);
  async function load() {
    const response = await fetch("/api/settings"), data = await response.json(); if (!response.ok) throw new Error(data.error);
    const p = data.profile, s = data.settings;
    setValues({ displayName: p.displayName ?? "", organizationName: p.organizationName ?? "", phone: p.phone, city: p.city, address: p.address, capacity: p.capacity, latitude: s.latitude, longitude: s.longitude, radiusKm: s.radiusKm, revision: s.revision, emailEnabled: s.emailEnabled, pushEnabled: s.pushEnabled }); setPushKey(data.pushPublicKey);
  }
  // load only updates state after its network request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await load(); setMessage(data.reviewRequired ? "Saved. An administrator must review your organization changes before new donation activity." : "Settings saved."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } finally { setBusy(false); }
  }
  async function push(enable: boolean) {
    setBusy(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !pushKey) throw new Error("Push is not configured or supported in this browser.");
      const registration = await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (enable) {
        if (await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted.");
        subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: pushKey });
      }
      if (subscription) {
        const response = await fetch("/api/push", { method: enable ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(enable ? subscription.toJSON() : { endpoint: subscription.endpoint }) });
        if (!response.ok) throw new Error((await response.json()).error);
        if (!enable) await subscription.unsubscribe();
      }
      setMessage(enable ? "Browser registered. Enable push below and save preferences." : "This browser is unsubscribed.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Push setup failed."); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl p-6"><Link href="/account">← Account</Link><h1 className="my-6 text-3xl font-bold">Profile & notification settings</h1><p>Organization, contact, capacity and coordinate changes require administrator review. Complete active pickups first. Coordinates are optional; missing coordinates use same-city matching.</p><p role="status" className="my-4">{message}</p>{values && <form onSubmit={save} className="grid gap-4">
    {(["displayName", "organizationName", "phone", "city", "address"] as const).map(key => <label key={key} className="grid gap-1">{{ displayName: "Display name", organizationName: "Organization name", phone: "Phone", city: "City", address: "Pickup / organization address" }[key]}<input className="rounded border p-3" value={values[key]} required={key !== "organizationName" && key !== "address"} onChange={e => setValues({ ...values, [key]: e.target.value })} /></label>)}
    {(["capacity", "latitude", "longitude", "radiusKm"] as const).map(key => <label key={key} className="grid gap-1">{{ capacity: "Meal capacity", latitude: "Organization latitude (optional)", longitude: "Organization longitude (optional)", radiusKm: "Matching radius (1–200 km)" }[key]}<input className="rounded border p-3" type="number" step={key === "latitude" || key === "longitude" ? "any" : "1"} value={values[key] ?? ""} onChange={e => setValues({ ...values, [key]: e.target.value === "" && (key === "latitude" || key === "longitude") ? null : Number(e.target.value) })} /></label>)}
    <label><input type="checkbox" checked={values.emailEnabled} onChange={e => setValues({ ...values, emailEnabled: e.target.checked })} /> Email account updates and pickup reminders</label>
    <label><input type="checkbox" checked={values.pushEnabled} onChange={e => setValues({ ...values, pushEnabled: e.target.checked })} /> Browser push updates and pickup reminders</label>
    <div className="flex gap-4"><button type="button" disabled={busy || !pushKey} onClick={() => push(true)}>Register this browser</button><button type="button" disabled={busy} onClick={() => push(false)}>Unsubscribe browser</button></div>
    <button disabled={busy} className="rounded bg-[#153f3a] p-3 text-white">{busy ? "Working…" : "Save settings"}</button>
  </form>}<nav className="my-8 flex gap-6"><Link href="/privacy">Privacy & data</Link><Link href="/incidents">Report an incident</Link></nav></main>;
}
