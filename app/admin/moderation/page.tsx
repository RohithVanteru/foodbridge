import Image from "next/image";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts, referrals } from "@/db/schema";
import { requireAdministrator } from "@/lib/server/admin";
import ModerationActions from "@/components/moderation-actions";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdministrator("/admin/moderation");
  const params = await searchParams; const page = Math.max(1, Math.min(100000, Number(params.page) || 1));
  const [posts, leads] = await Promise.all([getDb().select().from(communityPosts).orderBy(desc(communityPosts.id)).limit(25).offset((page-1)*25), getDb().select().from(referrals).orderBy(desc(referrals.id)).limit(25).offset((page-1)*25)]);
  return <><h1 className="text-3xl font-bold">Community & volunteer referrals</h1><p className="my-3">Review photos for consent and identifying information before publishing.</p><h2 className="text-xl font-bold mt-6">Community posts</h2>{posts.map(p => <article key={p.id} className="bg-white rounded-xl p-5 my-3 border"><p>#{p.id} · {p.status} · {p.authorUserId}</p><p className="whitespace-pre-wrap my-3">{p.body}</p>{p.imageKey && <Image unoptimized width={1600} height={1600} src={p.imageKey} alt="Submitted for moderation" className="max-h-72 rounded" />}<ModerationActions id={p.id} kind="post" /></article>)}{!posts.length && <p>No posts on this page.</p>}<h2 className="text-xl font-bold mt-8">Organization referrals</h2>{leads.map(r => <article className="bg-white rounded-xl p-5 my-3 border" key={r.id}><h3 className="font-bold">{r.organizationName} · {r.status}</h3><p>{r.city} · {r.contact}</p><p>{r.notes}</p><ModerationActions id={r.id} kind="referral" /></article>)}<nav className="flex gap-4 mt-6">{page > 1 && <a href={`?page=${page-1}`}>Previous</a>}{(posts.length===25 || leads.length===25) && <a href={`?page=${page+1}`}>Next</a>}</nav></>;
}
