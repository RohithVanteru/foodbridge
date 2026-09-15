import AuthCard from "../auth-card";
import { chatGPTSignInPath } from "../chatgpt-auth";

export default function LoginPage() {
  return <AuthCard mode="login" action={chatGPTSignInPath("/app")} />;
}
