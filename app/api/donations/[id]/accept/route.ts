import { requireApiProfile } from "@/lib/server/profile";
import { acceptDonation } from "@/lib/server/donation-service";
import { noStoreJson, validateSameOrigin } from "@/lib/server/security";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireApiProfile(); if (identity.error) return identity.error;
  const invalid = validateSameOrigin(request); if (invalid) return invalid;
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id < 1) return noStoreJson({ error: "Invalid donation" }, { status: 400 });
  try { return noStoreJson({ claim: await acceptDonation(id, identity.user.userId) }, { status: 201 }); }
  catch { return noStoreJson({ error: "Donation unavailable, expired, outside your city, or above your capacity." }, { status: 409 }); }
}
