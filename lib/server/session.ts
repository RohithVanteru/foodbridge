import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
export async function getUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) return null;
  return { userId: session.user.id, displayName: session.user.name, email: session.user.email, fullName: session.user.name };
}
export function signInPath(returnTo = "/app") {
  return "/login?returnTo=" + encodeURIComponent(safeReturnTo(returnTo));
}
export function signOutPath() { return "/logout"; }
export function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/app";
  const url = new URL(value, "https://local.test");
  if (url.origin !== "https://local.test" || /^\/(api|login|signup|logout)(\/|$)/.test(url.pathname)) return "/app";
  return url.pathname + url.search;
}
export async function requireUser(returnTo: string) {
  const user = await getUser();
  if (!user) redirect(signInPath(returnTo));
  return user;
}
