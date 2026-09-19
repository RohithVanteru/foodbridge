import { test } from "node:test";
import assert from "node:assert/strict";
import { sameServiceDay } from "../lib/server/dates";
import { canAdminister, validateWriteRequest } from "../lib/server/security";
test("same-day deadline respects service timezone", () => {
  process.env.SERVICE_TIMEZONE = "Asia/Kolkata";
  assert.equal(sameServiceDay(new Date("2026-09-16T18:29:00Z"), new Date("2026-09-16T01:00:00Z")), true);
  assert.equal(sameServiceDay(new Date("2026-09-16T18:31:00Z"), new Date("2026-09-16T01:00:00Z")), false);
});
test("admin requires allowlisted verified identity and database grant", () => {
  process.env.FOODBRIDGE_ADMIN_EMAILS = "owner@example.org";
  assert.equal(canAdminister({ isAdmin: true, verificationStatus: "verified" }, "owner@example.org", "https://food.example"), true);
  assert.equal(canAdminister({ isAdmin: true, verificationStatus: "verified" }, "other@example.org", "https://food.example"), false);
  assert.equal(canAdminister({ isAdmin: true, verificationStatus: "pending" }, "owner@example.org", "https://food.example"), false);
});
test("cross-site JSON writes fail closed", () => {
  process.env.BETTER_AUTH_URL = "https://food.example";
  const r = validateWriteRequest(new Request("http://internal:3000/api/profile", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" } }));
  assert.equal(r?.status, 403);
});
