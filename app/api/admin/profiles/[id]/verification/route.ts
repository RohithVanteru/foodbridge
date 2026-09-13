import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile();
  if (identity.error) return identity.error;
  if (!identity.profile.isAdmin) return Response.json({ error: "Administrator access is required." }, { status: 403 });
  const payload = await request.json() as { status?: string };
  if (payload.status !== "verified" && payload.status !== "rejected") return Response.json({ error: "Invalid verification status." }, { status: 400 });
  const { id } = await context.params;
  try {
    const db = getDb();
    const [profile] = await db.update(profiles).set({ verificationStatus: payload.status }).where(eq(profiles.id, id)).returning();
    if (!profile) return Response.json({ error: "Account not found." }, { status: 404 });
    return Response.json({ profile });
  } catch (error) {
    console.error("Profile verification failed", error);
    return Response.json({ error: "Verification update failed." }, { status: 503 });
  }
}
