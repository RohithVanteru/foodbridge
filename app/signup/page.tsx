import AuthCard from "../auth-card";
import { chatGPTSignInPath } from "../chatgpt-auth";
import { redirect } from "next/navigation";
import { getCurrentIdentity } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const identity = await getCurrentIdentity();
  if (identity.user) redirect(identity.profile ? "/app" : "/onboarding");
  return <AuthCard mode="signup" action={chatGPTSignInPath("/onboarding")} />;
}
