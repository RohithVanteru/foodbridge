import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, profiles } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { cleanText, isConfiguredAdministrator, noStoreJson, validateWriteRequest } from "@/lib/server/security";

const roles = new Set(["supplier", "beneficiary", "volunteer"]);

export async function GET() {
  const user = await getChatGPTUser();
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
  const user = await getChatGPTUser();
  if (!user) return noStoreJson({ error: "Sign in is required." }, { status: 401 });
  const invalidRequest = validateWriteRequest(request);
  if (invalidRequest) return invalidRequest;
  try {
    const payload = await request.json() as Record<string, unknown>;
    const role = String(payload.role ?? "");
    const organizationName = cleanText(payload.organizationName, 160);
    const displayName = cleanText(payload.displayName || user.displayName, 120);
    const phone = cleanText(payload.phone, 32);
    const city = cleanText(payload.city, 100);
    const address = cleanText(payload.address, 240);
    const capacity = Math.max(0, Math.min(100_000, Number(payload.capacity) || 0));
    if (!roles.has(role) || !displayName || !/^\+?[0-9 ()-]{7,32}$/.test(phone) || !city || (role !== "volunteer" && (!organizationName || !address)) || (role === "beneficiary" && capacity < 1)) {
      return noStoreJson({ error: "Complete all required account and organization details." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
    if (existing) return noStoreJson({ error: "Your account is already set up." }, { status: 409 });
    const isAdmin = isConfiguredAdministrator(user.email, request.url);
    const [profile] = await db.insert(profiles).values({
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
    await db.insert(auditEvents).values({ actorUserId: user.userId, action: "profile.created", targetType: "profile", targetId: user.userId, metadata: JSON.stringify({ role, administrator: isAdmin }) });
    return noStoreJson({ profile, administrator: isAdmin }, { status: 201 });
  } catch (error) {
    console.error("Profile creation failed", error);
    return noStoreJson({ error: "We could not finish account setup. Please try again." }, { status: 503 });
  }
}
