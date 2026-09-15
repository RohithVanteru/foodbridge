import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { noStoreJson } from "@/lib/server/security";

export async function GET() {
  try {
    await getDb().run(sql`select 1`);
    return noStoreJson({ status: "ok", database: "connected", checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Health check failed", error);
    return noStoreJson({ status: "degraded", database: "unavailable", checkedAt: new Date().toISOString() }, { status: 503 });
  }
}
