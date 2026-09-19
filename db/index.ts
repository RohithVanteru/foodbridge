import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { foodbridgePool?: Pool };
export const pool = globalDb.foodbridgePool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
if (process.env.NODE_ENV !== "production") globalDb.foodbridgePool = pool;
const db = drizzle(pool, { schema });
export function getDb() { return db; }
