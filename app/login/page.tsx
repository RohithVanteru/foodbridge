import AuthForm from "@/components/auth-form";
import { safeReturnTo } from "@/lib/server/session";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const identity = await getCurrentIdentity();
  if (identity.user) redirect(identity.profile ? "/app" : "/onboarding");
  const params = await searchParams;
  return <AuthForm mode="login" google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} returnTo={safeReturnTo(params.returnTo || "/app")} />;
}
