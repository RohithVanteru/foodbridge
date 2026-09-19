import { test } from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_APP_URL;
test("real email verification, login, onboarding, access controls and password reset", { skip: !base }, async () => {
  const email = `review-${Date.now()}@test.invalid`; const password = "test-password-strong-123";
  async function post(path: string, data: object, cookie = ""): Promise<Response> {
    for (let attempt=0; attempt<3; attempt++) {
      const response = await fetch(base + path, { method: "POST", headers: { "content-type": "application/json", origin: base!, cookie }, body: JSON.stringify(data), redirect: "manual" });
      if (response.status !== 429 || attempt===2) return response;
      await new Promise(resolve => setTimeout(resolve, 11000));
    }
    throw new Error("Rate limit retry exhausted");
  }
  assert.equal((await fetch(base + "/api/profile")).status, 401);
  assert.equal((await fetch(base + "/admin", { redirect: "manual", headers: { "x-chatgpt-user-email": "admin@test.invalid" } })).status, 307);
  assert.equal((await post("/api/auth/sign-up/email", {email,password,name:"Review",callbackURL:"/onboarding"})).status,200);
  assert.equal((await post("/api/auth/sign-in/email",{email,password})).status,403);
  async function mailLink(subject: string) {
    const inbox = await (await fetch((process.env.TEST_MAIL_URL || "http://localhost:58025")+"/api/v1/messages")).json();
    const message = inbox.messages.find((m: {Subject:string;To:{Address:string}[]})=>m.Subject===subject && m.To.some(t=>t.Address===email));
    assert.ok(message, "Expected email delivered to test inbox");
    const detail = await (await fetch((process.env.TEST_MAIL_URL || "http://localhost:58025")+"/api/v1/message/"+message.ID)).json();
    const url = detail.Text.match(/https?:\/\/\S+/)?.[0]; assert.ok(url); return url;
  }
  const verified = await fetch(await mailLink("Verify your FoodBridge email"), {redirect:"manual"}); assert.ok([200,302].includes(verified.status));
  const login = await post("/api/auth/sign-in/email",{email,password}); assert.equal(login.status,200);
  const cookie = login.headers.getSetCookie().map(v=>v.split(";")[0]).join("; "); assert.ok(cookie);
  const profile = await post("/api/profile",{role:"volunteer",displayName:"Review",phone:"9876543210",city:"Testcity"},cookie); assert.equal(profile.status,201);
  assert.equal((await post("/api/admin/moderate",{type:"post",id:1,status:"published"},cookie)).status,403);
  assert.equal((await post("/api/referrals",{organizationName:"Test Org",city:"Testcity",contact:"test@example.org",notes:""},cookie)).status,403);
  const csrf = await fetch(base+"/api/profile",{method:"POST",headers:{"content-type":"application/json",origin:"https://evil.example",cookie},body:"{}"}); assert.equal(csrf.status,403);
  assert.equal((await post("/api/auth/request-password-reset",{email,redirectTo:"/reset-password"})).status,200);
  const resetRedirect = await fetch(await mailLink("Reset your FoodBridge password"),{redirect:"manual"});
  const resetUrl = new URL(resetRedirect.headers.get("location")!,base); const token=resetUrl.searchParams.get("token"); assert.ok(token);
  assert.equal((await post("/api/auth/reset-password",{token,newPassword:password+"changed"})).status,200);
  assert.equal((await post("/api/auth/sign-in/email",{email,password})).status,401);
  assert.equal((await post("/api/auth/sign-in/email",{email,password:password+"changed"})).status,200);
  assert.equal((await fetch(base+"/api/profile",{headers:{cookie}})).status,401);
});
