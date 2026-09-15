import AuthCard from "../auth-card";
import { chatGPTSignInPath } from "../chatgpt-auth";

export default function SignupPage() {
  return <AuthCard mode="signup" action={chatGPTSignInPath("/onboarding")} />;
}
