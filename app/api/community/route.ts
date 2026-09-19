import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { auditEvents, claims, communityPosts, donations, profiles, media } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { readBody } from "@/lib/server/body";
import { lockActiveAccount } from "@/lib/server/account-lock";
import { validateWriteRequest, noStoreJson } from "@/lib/server/security";
export async function GET() {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const posts = await getDb().select({ id: communityPosts.id, body: communityPosts.body, imageKey: communityPosts.imageKey, createdAt: communityPosts.createdAt, author: profiles.displayName, status: communityPosts.status }).from(communityPosts).innerJoin(profiles, eq(profiles.id, communityPosts.authorUserId)).where(or(eq(communityPosts.status, "published"), eq(communityPosts.authorUserId, identity.user.userId))).orderBy(desc(communityPosts.id)).limit(100);
  return noStoreJson({ posts });
}
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  if (identity.profile.verificationStatus !== "verified") return noStoreJson({ error: "Verification required." }, { status: 403 });
  try {
    const data = await readBody(request, z.object({ body: z.string().trim().min(1).max(2000), donationId: z.number().int().positive().optional(), imageKey: z.string().regex(/^\/api\/media\/[a-f0-9-]+\.webp$/).optional(), photoConsent: z.boolean().optional() }));
    if (data.imageKey && !data.photoConsent) throw new Error("Photo consent is required.");
    if (data.imageKey) {
      const [image] = await getDb().select().from(media).where(and(eq(media.key, data.imageKey.split("/").pop()!), eq(media.ownerId, identity.user.userId)));
      if (!image) throw new Error("Upload your own photo.");
    }
    if (data.donationId) {
      const [d] = await getDb().select().from(donations).where(and(eq(donations.id, data.donationId), eq(donations.status, "collected")));
      const [c] = await getDb().select().from(claims).where(and(eq(claims.donationId, data.donationId), eq(claims.beneficiaryUserId, identity.user.userId)));
      if (!d || (d.supplierUserId !== identity.user.userId && !c)) throw new Error("Only completed pickup participants can link this donation.");
    }
    await getDb().transaction(async tx => {
      await lockActiveAccount(tx, identity.user.userId);
      if (data.imageKey) {
        const [image] = await tx.select().from(media).where(and(eq(media.key, data.imageKey.split("/").pop()!), eq(media.ownerId, identity.user.userId))).for("update");
        if (!image) throw new Error("Photo consent was withdrawn.");
      }
      const [post] = await tx.insert(communityPosts).values({ authorUserId: identity.user.userId, body: data.body, donationId: data.donationId, imageKey: data.imageKey }).returning();
      await tx.insert(auditEvents).values({ actorUserId: identity.user.userId, action: "post.submitted", targetType: "post", targetId: String(post.id), metadata: JSON.stringify({ photoConsent: data.photoConsent === true }) });
    });
    return noStoreJson({ message: "Post submitted for moderation." }, { status: 201 });
  } catch { return noStoreJson({ error: "Invalid post, photo consent, or donation reference." }, { status: 400 }); }
}
