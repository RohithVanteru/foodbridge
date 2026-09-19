import { timingSafeEqual } from "node:crypto";
import { noStoreJson } from "@/lib/server/security";
import { deliverNotifications, queueNotifications } from "@/lib/server/notification-worker";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET, provided = Buffer.from(request.headers.get("authorization") ?? ""), expected = Buffer.from("Bearer " + secret);
  if (!secret || secret.length < 32 || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  await queueNotifications();
  return noStoreJson(await deliverNotifications());
}
