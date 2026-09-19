import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, pool } from "../db/index";
try { await migrate(getDb(), { migrationsFolder: "./migrations" }); console.log("PostgreSQL migrations applied."); }
finally { await pool.end(); }
