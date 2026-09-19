import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, profiles } from "@/db/schema";
import { getUser } from "@/lib/server/session";
import { cleanText, isConfiguredAdministrator, noStoreJson, validateWriteRequest } from "@/lib/server/security";
import { readBody } from "@/lib/server/body";
import { z } from "zod";

const roles = new Set(["supplier", "beneficiary", "volunteer"]);

export async function GET() {
  const user = await getUser();
  if (!user) return noStoreJson({ error: "Sign in is required." }, { status: 401 });
  try {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
    return noStoreJson({ user, profile: profile ?? null });
  } catch (error) {
    console.error("Profile lookup failed", error);
    return noStoreJson({ error: "Account service is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return noStoreJson({ error: "Sign in is required." }, { status: 401 });
  const invalidRequest = validateWriteRequest(request);
  if (invalidRequest) return invalidRequest;
  try {
    const payload = await readBody(request, z.object({
      role: z.enum(["supplier", "beneficiary", "volunteer"]), displayName: z.string().trim().min(1).max(120),
      organizationName: z.string().max(160).nullable().optional(), phone: z.string().max(32),
      city: z.string().trim().min(2).max(100), address: z.string().max(240).nullable().optional(),
      capacity: z.union([z.string(), z.number(), z.null()]).optional(),
    }));
    const role = String(payload.role ?? "");
    const organizationName = cleanText(payload.organizationName, 160);
    const displayName = cleanText(payload.displayName || user.displayName, 120);
    const phone = cleanText(payload.phone, 32);
    const city = cleanText(payload.city, 100).toLowerCase();
    const address = cleanText(payload.address, 240);
    const capacity = Math.max(0, Math.min(100_000, Number(payload.capacity) || 0));
    if (!Number.isInteger(capacity)) return noStoreJson({ error: "Capacity must be a whole number." }, { status: 400 });
    if (!roles.has(role) || !displayName || !/^\+?[0-9 ()-]{7,32}$/.test(phone) || !city || (role !== "volunteer" && (!organizationName || !address)) || (role === "beneficiary" && capacity < 1)) {
      return noStoreJson({ error: "Complete all required account and organization details." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
    if (existing) return noStoreJson({ error: "Your account is already set up." }, { status: 409 });
    const isAdmin = isConfiguredAdministrator(user.email, request.url);
    const profile = await db.transaction(async tx => {
    const [profile] = await tx.insert(profiles).values({
      id: user.userId,
      email: user.email,
      displayName,
      role: role as "supplier" | "beneficiary" | "volunteer",
      organizationName: organizationName || null,
      phone,
      city,
      address,
      capacity,
      isAdmin,
      verificationStatus: isAdmin ? "verified" : "pending",
    }).returning();
    await tx.insert(auditEvents).values({ actorUserId: user.userId, action: "profile.created", targetType: "profile", targetId: user.userId, metadata: JSON.stringify({ role, administrator: isAdmin }) });
    return profile;
    });
    return noStoreJson({ profile, administrator: isAdmin }, { status: 201 });
  } catch (error) {
    console.error("Profile creation failed", error);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return noStoreJson({ error: "Invalid profile details." }, { status: 400 });
    return noStoreJson({ error: "We could not finish account setup. Please try again." }, { status: 503 });
  }
}
