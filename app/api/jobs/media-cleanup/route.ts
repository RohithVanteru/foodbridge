import { timingSafeEqual } from "node:crypto";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { noStoreJson } from "@/lib/server/security";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET, provided = Buffer.from(request.headers.get("authorization") ?? ""), expected = Buffer.from("Bearer " + secret);
  if (!secret || secret.length < 32 || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  const directory = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
  let removed = 0;
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (removed >= 500) break;
      if (!entry.isFile() || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/.test(entry.name)) continue;
      const file = path.join(directory, entry.name);
      try {
        // Grace period protects uploads written before their database transaction commits.
        if ((await stat(file)).mtimeMs > Date.now() - 86400000) continue;
        const [active] = await getDb().select({ key: media.key }).from(media).where(eq(media.key, entry.name));
        if (!active) { await unlink(file); removed++; }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return noStoreJson({ removed });
}
