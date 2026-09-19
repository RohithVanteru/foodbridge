import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getDb } from "@/db";
import { lockActiveAccount } from "@/lib/server/account-lock";
import { media } from "@/db/schema";
import { requireApiProfile } from "@/lib/server/profile";
import { noStoreJson, validateSameOrigin } from "@/lib/server/security";
export async function POST(request: Request) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  if (identity.profile.verificationStatus !== "verified") return noStoreJson({ error: "Verification required" }, { status: 403 });
  const invalid = validateSameOrigin(request); if (invalid) return invalid;
  try {
    const reader = request.body?.getReader(); if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const result = await reader.read(); if (result.done) break; size += result.value.length; if (size > 5_300_000) { await reader.cancel(); throw new Error(); } chunks.push(result.value); }
    const buffer = Buffer.concat(chunks);
    const data = await new Response(buffer, { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
    const photo = data.get("photo");
    if (!(photo instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5_000_000) throw new Error();
    const output = await sharp(Buffer.from(await photo.arrayBuffer()), { limitInputPixels: 20_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const key = randomUUID() + ".webp";
    const directory = path.resolve(process.env.UPLOAD_DIR || "./data/uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, key), output, { flag: "wx" });
    await getDb().transaction(async tx => { await lockActiveAccount(tx, identity.user.userId); await tx.insert(media).values({ key, ownerId: identity.user.userId }); });
    return noStoreJson({ imageKey: "/api/media/" + key }, { status: 201 });
  } catch { return noStoreJson({ error: "Upload a JPEG, PNG, or WebP under 5 MB and 20 megapixels." }, { status: 400 }); }
}
