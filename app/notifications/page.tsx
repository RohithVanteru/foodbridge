"use client";
import { useEffect, useState } from "react";
type Item = { id: number; title: string; body: string; href: string; read: boolean };
export default function Page() {
  const [items, setItems] = useState<Item[]>([]), [error, setError] = useState("");
  useEffect(() => { fetch("/api/notifications").then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.notifications); }).catch(e => setError(e.message)); }, []);
  return <main className="mx-auto max-w-3xl space-y-5 p-6"><a href="/app">← Dashboard</a><h1 className="text-3xl font-bold">Notifications</h1>{error && <p role="alert">{error}</p>}{items.map(n => <article key={n.id} className="rounded-2xl border p-5"><h2 className="font-bold">{n.title} {!n.read && "· New"}</h2><p>{n.body}</p><a className="mt-3 inline-block underline" href={n.href} onClick={() => { void fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: n.id }) }); }}>View details</a></article>)}{!items.length && !error && <p>No notifications yet.</p>}</main>;
}
