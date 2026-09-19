"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
type Post = { id: number; body: string; author: string; status: string; imageKey?: string };
export default function Community() {
  const [posts, setPosts] = useState<Post[]>([]), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  async function load() { const r = await fetch("/api/community"); const d = await r.json(); if (r.ok) setPosts(d.posts); else setMessage(d.error); }
  useEffect(() => { const timer = setTimeout(() => { void load().catch(() => setMessage("Could not load data. Please refresh.")); }, 0); return () => clearTimeout(timer); }, []);
  return <section className="space-y-5"><h1 className="text-3xl font-bold">Community</h1><form className="space-y-3 rounded-2xl border bg-white p-5" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage("");
    const form = e.currentTarget; const fields = new FormData(form);
    try {
      let imageKey: string | undefined; const file = fields.get("photo") as File;
      if (file?.size) {
        if (fields.get("consent") !== "on") throw new Error("Confirm permission from the people shown in this photo.");
        const upload = new FormData(); upload.set("photo", file);
        const response = await fetch("/api/media", { method: "POST", body: upload }); const data = await response.json();
        if (!response.ok) throw new Error(data.error); imageKey = data.imageKey;
      }
      const r = await fetch("/api/community", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: fields.get("body"), imageKey, photoConsent: fields.get("consent") === "on" }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessage(d.message); form.reset(); await load();
    } catch(e) { setMessage(e instanceof Error ? e.message : "Unable to submit post"); } finally { setBusy(false); }
  }}><label className="field">Share a story or thank-you<Textarea name="body" required maxLength={2000} /></label><label className="field">Photo (optional, JPEG/PNG/WebP, 5 MB maximum)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label><label className="flex gap-2 text-sm"><input name="consent" type="checkbox" />I have permission to share this photo from everyone shown or their guardian.</label><Button disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Button></form>{message && <p role="status">{message}</p>}{posts.map(p => <article key={p.id} className="rounded-2xl border bg-white p-5"><p className="font-bold">{p.author} <span className="text-xs font-normal">{p.status !== "published" && p.status}</span></p><p className="mt-3 whitespace-pre-wrap">{p.body}</p>{p.imageKey && <Image unoptimized width={1600} height={1600} src={p.imageKey} alt="Community donation update" className="mt-4 max-h-96 rounded-xl object-contain" />}</article>)}{!posts.length && <p>No stories yet. Share your first update.</p>}</section>;
}
