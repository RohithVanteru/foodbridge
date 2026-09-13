import { count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const roles = new Set(["supplier", "beneficiary", "volunteer"]);

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
    return Response.json({ user, profile: profile ?? null });
  } catch (error) {
    console.error("Profile lookup failed", error);
    return Response.json({ error: "Account service is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const role = String(payload.role ?? "");
    const organizationName = String(payload.organizationName ?? "").trim();
    const displayName = String(payload.displayName ?? user.displayName).trim();
    const phone = String(payload.phone ?? "").trim();
    const city = String(payload.city ?? "").trim();
    const address = String(payload.address ?? "").trim();
    const capacity = Math.max(0, Number(payload.capacity) || 0);
    if (!roles.has(role) || !displayName || !phone || !city || (role !== "volunteer" && (!organizationName || !address))) {
      return Response.json({ error: "Complete all required account and organization details." }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.userId)).limit(1);
    if (existing) return Response.json({ error: "Your account is already set up." }, { status: 409 });
    const [{ value: profileCount }] = await db.select({ value: count() }).from(profiles);
    const isFirstAccount = profileCount === 0;
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
      isAdmin: isFirstAccount,
      verificationStatus: isFirstAccount ? "verified" : "pending",
    }).returning();
    return Response.json({ profile, firstAdministrator: isFirstAccount }, { status: 201 });
  } catch (error) {
    console.error("Profile creation failed", error);
    return Response.json({ error: "We could not finish account setup. Please try again." }, { status: 503 });
  }
}
