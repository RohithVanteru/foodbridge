import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, pool } from "../db";
import { claims, donations, profiles } from "../db/schema";
import { acceptDonation, changeDonationStatus } from "../lib/server/donation-service";
test("atomic claim, ownership, completion and expiry", { skip: !process.env.TEST_DATABASE }, async () => {
  const db = getDb(); const prefix = randomUUID();
  const supplier = prefix + "s"; const a = prefix + "a"; const b = prefix + "b";
  try {
    await db.insert(profiles).values([supplier,a,b].map((id,i) => ({ id, email: id+"@test.invalid", role: i===0 ? "supplier" as const : "beneficiary" as const, verificationStatus: "verified" as const, city: "testcity", capacity: 100 })));
    const [d] = await db.insert(donations).values({ supplierUserId:supplier,supplierName:"Test",city:"testcity",foodDescription:"Rice",servings:20,pickupAddress:"Test address",pickupBy:new Date(Date.now()+3600000).toISOString(),safetyConfirmed:true }).returning();
    const results = await Promise.allSettled([acceptDonation(d.id,a),acceptDonation(d.id,b)]);
    assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
    const rows=await db.select().from(claims).where(eq(claims.donationId,d.id)); assert.equal(rows.length,1);
    await assert.rejects(changeDonationStatus(d.id,"outsider",false,"collected"));
    await changeDonationStatus(d.id,rows[0].beneficiaryUserId,false,"collected");
    assert.equal((await db.select().from(claims).where(eq(claims.donationId,d.id)))[0].status,"collected");
    await assert.rejects(changeDonationStatus(d.id,supplier,false,"cancelled"));
    const [expired] = await db.insert(donations).values({supplierUserId:supplier,supplierName:"Test",city:"testcity",foodDescription:"Old",servings:20,pickupAddress:"Test",pickupBy:new Date(Date.now()-1000).toISOString()}).returning();
    await assert.rejects(acceptDonation(expired.id,a));
    await changeDonationStatus(expired.id,"system:expiry",true,"expired");
  } finally { await pool.end(); }
});
