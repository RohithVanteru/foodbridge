import { timingSafeEqual } from "node:crypto";
import { and, eq, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import { donations } from "@/db/schema";
import { changeDonationStatus } from "@/lib/server/donation-service";
import { noStoreJson } from "@/lib/server/security";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + secret);
  if (!secret || secret.length < 32 || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  const rows = await getDb().select({ id: donations.id }).from(donations).where(and(or(eq(donations.status, "available"), eq(donations.status, "claimed")), lte(donations.pickupBy, new Date().toISOString()))).limit(500);
  let expired = 0;
  for (const row of rows) { try { await changeDonationStatus(row.id, "system:expiry", true, "expired"); expired++; } catch { /* Concurrent completion or another expiry worker won. */ } }
  return noStoreJson({ expired });
}
