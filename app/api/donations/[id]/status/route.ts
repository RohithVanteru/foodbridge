import { z } from "zod";
import { requireApiProfile } from "@/lib/server/profile";
import { changeDonationStatus } from "@/lib/server/donation-service";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  if (identity.profile.verificationStatus !== "verified") return noStoreJson({ error: "Verification required" }, { status: 403 });
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const { status } = await readBody(request, z.object({ status: z.enum(["collected", "cancelled"]) }));
    const id = z.coerce.number().int().positive().parse((await context.params).id);
    return noStoreJson({ donation: await changeDonationStatus(id, identity.user.userId, false, status) });
  } catch (e) { return noStoreJson({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 }); }
}
