import { z } from "zod";
import { requireApiAdministrator } from "@/lib/server/profile";
import { changeDonationStatus } from "@/lib/server/donation-service";
import { noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiAdministrator(request); if (identity.error) return identity.error;
  const invalid = validateWriteRequest(request); if (invalid) return invalid;
  try {
    const { status } = await readBody(request, z.object({ status: z.enum(["collected", "cancelled", "expired"]) }));
    const id = z.coerce.number().int().positive().parse((await context.params).id);
    return noStoreJson({ donation: await changeDonationStatus(id, identity.user.userId, true, status) });
  } catch (e) { return noStoreJson({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 }); }
}
