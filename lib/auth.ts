import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendMail } from "@/lib/server/mail";

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || !baseURL) throw new Error("Configure BETTER_AUTH_SECRET (32+ characters) and BETTER_AUTH_URL.");
  return betterAuth({
    appName: "FoodBridge", secret, baseURL, trustedOrigins: [baseURL],
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true, minPasswordLength: 12, requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => { await sendMail(user.email, "Reset your FoodBridge password", `Reset your password: ${url}\nThis link expires. If you did not request it, ignore this email.`); },
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => { await sendMail(user.email, "Verify your FoodBridge email", `Verify your email: ${url}`); },
    },
    socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
    } : {},
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    advanced: { useSecureCookies: baseURL.startsWith("https://") },
  });
}
