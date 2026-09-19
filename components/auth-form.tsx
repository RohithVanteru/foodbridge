"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function AuthForm({ mode, google, returnTo = "/app", token }: { mode: "login" | "signup" | "forgot" | "reset"; google?: boolean; returnTo?: string; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({ email, password, name: String(form.get("name")), callbackURL: "/onboarding" });
        if (result.error) throw new Error(result.error.message);
        setMessage("Check your email to verify your account, then continue to organization setup.");
      } else if (mode === "login") {
        const result = await authClient.signIn.email({ email, password, callbackURL: returnTo });
        if (result.error) throw new Error(result.error.message);
        window.location.assign(returnTo);
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        if (result.error) throw new Error(result.error.message);
        setMessage("If this email has an account, a reset link will arrive shortly.");
      } else {
        const result = await authClient.resetPassword({ newPassword: password, token: token || "" });
        if (result.error) throw new Error(result.error.message);
        setMessage("Password changed. You can now sign in.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to complete request."); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-[#f6f6f1] p-6"><section className="w-full max-w-md rounded-3xl border bg-white p-8 text-[#17332f]"><Link href="/" className="text-2xl font-bold">FoodBridge</Link><h1 className="mt-8 text-3xl font-bold">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Forgot password?" : mode === "reset" ? "Choose a new password" : "Welcome back"}</h1><form onSubmit={submit} className="mt-6 space-y-5">{mode === "signup" && <label className="field">Name<Input required name="name" autoComplete="name" maxLength={120} /></label>}{mode !== "reset" && <label className="field">Email<Input name="email" required type="email" autoComplete="email" /></label>}{mode !== "forgot" && <label className="field">Password<Input name="password" required type="password" minLength={mode === "login" ? 1 : 12} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} />{mode !== "login" && <span className="text-xs">Use at least 12 characters.</span>}</label>}{error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-800">{message}</p>}<Button disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Reset password" : "Sign in"}</Button></form>{google && ["login", "signup"].includes(mode) && <Button variant="outline" disabled={busy} className="mt-4 w-full" onClick={async () => { setBusy(true); try { const result = await authClient.signIn.social({ provider: "google", callbackURL: returnTo }); if (result.error) setError(result.error.message || "Google sign-in failed"); } catch { setError("Google sign-in failed"); } finally { setBusy(false); } }}>Continue with Google</Button>}<nav className="mt-6 flex flex-wrap gap-4 text-sm"><a href="/login">Sign in</a><a href="/signup">Create account</a><a href="/forgot-password">Forgot password</a></nav></section></main>;
}
