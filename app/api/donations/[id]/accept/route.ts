import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { claims, donations } from "@/db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = request.headers.get("oai-authenticated-user-id") ?? (["localhost", "127.0.0.1"].includes(new URL(request.url).hostname) ? "local-preview" : null);
  if (!userId) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const { id } = await context.params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) return Response.json({ error: "Invalid donation." }, { status: 400 });
  try {
    const db = getDb();
    const [donation] = await db.select().from(donations).where(and(eq(donations.id, donationId), eq(donations.status, "available"))).limit(1);
    if (!donation) return Response.json({ error: "This donation is no longer available." }, { status: 409 });
    const [claim] = await db.insert(claims).values({ donationId, beneficiaryUserId: userId }).returning();
    await db.update(donations).set({ status: "claimed" }).where(eq(donations.id, donationId));
    return Response.json({ claim }, { status: 201 });
  } catch (error) {
    console.error("Accept donation error", error);
    return Response.json({ error: "We could not reserve this donation. Please refresh and try again." }, { status: 503 });
  }
}
