import AuthForm from "@/components/auth-form";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const identity = await getCurrentIdentity();
  if (identity.user) redirect(identity.profile ? "/app" : "/onboarding");
  return <AuthForm mode="signup" google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} returnTo="/onboarding" />;
}
