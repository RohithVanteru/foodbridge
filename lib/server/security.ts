import { env } from "cloudflare:workers";

export function isConfiguredAdministrator(email: string, requestUrl: string) {
  let host = "";
  try {
    host = new URL(requestUrl).hostname;
  } catch {
    return false;
  }
  if (["localhost", "127.0.0.1"].includes(host) && email === "seedy@sites.test") return true;
  const allowed = (env.FOODBRIDGE_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export function canAdminister(profile: { isAdmin: boolean; verificationStatus: string }, email: string, requestUrl: string) {
  return profile.isAdmin && profile.verificationStatus === "verified" && isConfiguredAdministrator(email, requestUrl);
}

export function validateWriteRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return noStoreJson({ error: "JSON content type is required." }, { status: 415 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_384) return noStoreJson({ error: "Request is too large." }, { status: 413 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return noStoreJson({ error: "Cross-site request rejected." }, { status: 403 });
  return null;
}

export function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return noStoreJson({ error: "Cross-site request rejected." }, { status: 403 });
  }
  return null;
}

export function cleanText(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

export function noStoreJson(body: object, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}
