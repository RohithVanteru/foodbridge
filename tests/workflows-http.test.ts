import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.TEST_APP_URL;
test("admin reviews, donation handoff, moderated photos and volunteer referrals", { skip: !process.env.TEST_WORKFLOWS }, async () => {
  assert.ok(base); const password="test-password-strong-123";
  async function post(path:string,data:object,cookie="",attempt=0):Promise<Response> {
    const r=await fetch(base+path,{method:"POST",headers:{origin:base!,"content-type":"application/json",cookie},body:JSON.stringify(data)});
    if(r.status===429 && attempt<3){await new Promise(resolve=>setTimeout(resolve,11000)); return post(path,data,cookie,attempt+1);} return r;
  }
  async function identity(role:string,admin=false) {
    const email=admin ? "admin@test.invalid" : `${role}-${Date.now()}@test.invalid`;
    if(!admin) assert.equal((await post("/api/auth/sign-up/email",{email,password,name:role})).status,200);
    if(!admin) {
      const inbox=await(await fetch("http://localhost:58025/api/v1/messages")).json();
      const m=inbox.messages.find((m:{To:{Address:string}[];Subject:string})=>m.Subject==="Verify your FoodBridge email"&&m.To.some(t=>t.Address===email));
      assert.ok(m); const detail=await(await fetch("http://localhost:58025/api/v1/message/"+m.ID)).json();
      const url=new URL(detail.Text.match(/https?:\/\/\S+/)[0]);
      await fetch(base+url.pathname+url.search,{redirect:"manual"});
    }
    const login=await post("/api/auth/sign-in/email",{email,password}); assert.equal(login.status,200);
    const cookie=login.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ");
    const p=await post("/api/profile",{role,displayName:role,organizationName:"Test "+role,phone:"9876543210",city:"Bengaluru",address:"Test street 123",capacity:100},cookie);
    assert.ok([201,409].includes(p.status));
    const identity=await(await fetch(base+"/api/profile",{headers:{cookie}})).json(); return {cookie,id:identity.user.userId};
  }
  const admin=await identity("volunteer",true);
  assert.equal((await fetch(base+"/admin",{headers:{cookie:admin.cookie}})).status,200);
  const supplier=await identity("supplier"), beneficiary=await identity("beneficiary"),volunteer=await identity("volunteer");
  for(const who of [supplier,beneficiary,volunteer]) assert.equal((await post(`/api/admin/profiles/${who.id}/verification`,{status:"verified"},admin.cookie)).status,200);
  const created=await post("/api/donations",{foodDescription:"Test rice",servings:20,pickupBy:new Date(Date.now()+600000).toISOString(),pickupAddress:"Test street 123",safetyConfirmed:true},supplier.cookie); assert.equal(created.status,201);
  const {donation}=await created.json();
  const publicList=await(await fetch(base+"/api/donations",{headers:{cookie:beneficiary.cookie}})).json(); assert.ok(publicList.donations.some((d:{id:number})=>d.id===donation.id)); assert.equal(publicList.donations[0].pickupAddress,undefined);
  assert.equal((await post(`/api/donations/${donation.id}/accept`,{},beneficiary.cookie)).status,201);
  assert.equal((await post(`/api/donations/${donation.id}/status`,{status:"collected"},beneficiary.cookie)).status,200);
  const photo=await sharp({create:{width:10,height:10,channels:3,background:"green"}}).png().toBuffer();
  const form=new FormData(); form.set("photo",new Blob([new Uint8Array(photo)],{type:"image/png"}),"test.png");
  const upload=await fetch(base+"/api/media",{method:"POST",headers:{cookie:beneficiary.cookie,origin:base!},body:form}); assert.equal(upload.status,201); const {imageKey}=await upload.json();
  assert.equal((await fetch(base+imageKey,{headers:{cookie:volunteer.cookie}})).status,404);
  assert.equal((await post("/api/community",{body:"Thank you",donationId:donation.id,imageKey,photoConsent:true},beneficiary.cookie)).status,201);
  const feed=await(await fetch(base+"/api/community",{headers:{cookie:beneficiary.cookie}})).json(); const entry=feed.posts.find((p:{imageKey:string})=>p.imageKey===imageKey); assert.equal(entry.status,"pending");
  assert.equal((await post("/api/admin/moderate",{type:"post",id:entry.id,status:"published"},admin.cookie)).status,200);
  assert.equal((await fetch(base+imageKey,{headers:{cookie:volunteer.cookie}})).status,200);
  assert.equal((await post("/api/referrals",{organizationName:"Test Home",city:"Bengaluru",contact:"test@example.org",notes:"Please contact"},volunteer.cookie)).status,201);
  const referrals=await(await fetch(base+"/api/referrals",{headers:{cookie:volunteer.cookie}})).json();
  assert.equal((await post("/api/admin/moderate",{type:"referral",id:referrals.referrals[0].id,status:"contacted"},admin.cookie)).status,200);
  const notices=await(await fetch(base+"/api/notifications",{headers:{cookie:beneficiary.cookie}})).json(); assert.ok(notices.notifications.length>=3);
  // Profile edits require a fresh review and reject stale revisions/privilege fields.
  const oldSettings = await (await fetch(base+"/api/settings", {headers:{cookie:beneficiary.cookie}})).json();
  const p = oldSettings.profile;
  const settings = { revision:0, displayName:p.displayName, organizationName:p.organizationName, phone:p.phone, city:p.city, address:"New test address", capacity:p.capacity, latitude:12.97, longitude:77.59, radiusKm:25, emailEnabled:true, pushEnabled:false };
  async function patch(path:string,data:object,cookie:string) { return fetch(base+path,{method:"PATCH",headers:{origin:base!,"content-type":"application/json",cookie},body:JSON.stringify(data)}); }
  assert.equal((await patch("/api/settings",{...settings,isAdmin:true},beneficiary.cookie)).status,400);
  assert.equal((await patch("/api/settings",settings,beneficiary.cookie)).status,200);
  assert.equal((await patch("/api/settings",settings,beneficiary.cookie)).status,400);
  assert.equal((await fetch(base+"/api/donations",{headers:{cookie:beneficiary.cookie}})).status,403);
  assert.equal((await post(`/api/admin/profiles/${beneficiary.id}/verification`,{status:"verified"},admin.cookie)).status,200);
  const reportResponse=await post("/api/incidents",{category:"food_safety",description:"Test report about pickup handling."},beneficiary.cookie); assert.equal(reportResponse.status,201);
  const report=await reportResponse.json();
  assert.equal((await fetch(base+"/api/incidents?admin=1",{headers:{cookie:supplier.cookie}})).status,403);
  const otherReports=await(await fetch(base+"/api/incidents",{headers:{cookie:supplier.cookie}})).json(); assert.ok(!otherReports.incidents.some((r:{id:number})=>r.id===report.id));
  assert.equal((await patch("/api/incidents",{id:report.id,revision:0,status:"investigating",resolution:"We are reviewing this report.",internalNotes:"Private investigation note"},admin.cookie)).status,200);
  const ownReports=await(await fetch(base+"/api/incidents",{headers:{cookie:beneficiary.cookie}})).json(); assert.equal(ownReports.incidents[0].internalNotes,undefined);
  const exported=await(await fetch(base+"/api/privacy?export=1",{headers:{cookie:beneficiary.cookie}})).text();
  assert.ok(!exported.includes("Private investigation note")); assert.ok(!exported.includes(password)); assert.ok(!exported.includes('"accessToken"'));
  assert.equal((await post("/api/privacy",{action:"withdraw_photo",key:imageKey.split("/").pop()},supplier.cookie)).status,400);
  assert.equal((await post("/api/privacy",{action:"withdraw_photo",key:imageKey.split("/").pop()},beneficiary.cookie)).status,200);
  assert.equal((await fetch(base+imageKey,{headers:{cookie:beneficiary.cookie}})).status,404);
  assert.equal((await post("/api/community",{body:"Cannot reuse withdrawn photo",imageKey,photoConsent:true},beneficiary.cookie)).status,400);
  assert.equal((await post("/api/push",{endpoint:"http://127.0.0.1/push",keys:{p256dh:"x",auth:"x"}},beneficiary.cookie)).status,400);
  if(process.env.CRON_SECRET) {
    assert.equal((await fetch(base+"/api/jobs/notifications",{method:"POST"})).status,401);
    const worker=await fetch(base+"/api/jobs/notifications",{method:"POST",headers:{authorization:"Bearer "+process.env.CRON_SECRET}}); assert.equal(worker.status,200);
    const delivery=await(await fetch(base+"/api/admin/operations",{headers:{cookie:admin.cookie}})).json(); assert.ok(delivery.deliveries.some((d:{userId:string;status:string})=>d.userId===beneficiary.id&&d.status==="sent"));
  }
  assert.equal((await post("/api/privacy",{action:"request_deletion",confirmation:"DELETE MY ACCOUNT"},beneficiary.cookie)).status,200);
  const deletion={action:"delete_account",userId:beneficiary.id,confirmation:"ANONYMIZE AND DELETE LOGIN"};
  assert.equal((await post("/api/admin/operations",deletion,supplier.cookie)).status,403);
  assert.equal((await post("/api/admin/operations",deletion,admin.cookie)).status,400); // open incident blocks deletion
  assert.equal((await patch("/api/incidents",{id:report.id,revision:1,status:"resolved",resolution:"Test investigation completed.",internalNotes:"Private investigation note"},admin.cookie)).status,200);
  assert.equal((await post("/api/admin/operations",deletion,admin.cookie)).status,200);
  assert.equal((await fetch(base+"/api/profile",{headers:{cookie:beneficiary.cookie}})).status,401);
});
