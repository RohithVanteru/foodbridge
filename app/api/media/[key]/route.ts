import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { communityPosts, media } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { canAdminister, noStoreJson } from "@/lib/server/security";
export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const { key } = await context.params;
  if (!/^[a-f0-9-]+\.webp$/.test(key)) return new Response(null, { status: 404 });
  const [image] = await getDb().select().from(media).where(eq(media.key, key));
  if (!image) return new Response(null, { status: 404 });
  const [post] = await getDb().select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.imageKey, "/api/media/" + key), eq(communityPosts.status, "published")));
  if (image.ownerId !== identity.user.userId && !post && !canAdminister(identity.profile, identity.user.email, request.url)) return new Response(null, { status: 404 });
  try { const buffer = await readFile(path.join(path.resolve(process.env.UPLOAD_DIR || "./data/uploads"), key)); return new Response(buffer, { headers: { "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } }); }
  catch { return noStoreJson({ error: "Image unavailable" }, { status: 404 }); }
}
