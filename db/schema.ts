import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role", { enum: ["supplier", "beneficiary", "volunteer"] }).notNull(),
  organizationName: text("organization_name"),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  address: text("address").notNull().default(""),
  capacity: integer("capacity").notNull().default(0),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_profiles_verification_status").on(table.verificationStatus)]);

export const donations = sqliteTable("donations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierUserId: text("supplier_user_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  foodDescription: text("food_description").notNull(),
  servings: integer("servings").notNull(),
  dietaryNotes: text("dietary_notes").notNull().default("[]"),
  pickupAddress: text("pickup_address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  pickupBy: text("pickup_by").notNull(),
  instructions: text("instructions").notNull().default(""),
  safetyConfirmed: integer("safety_confirmed", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["available", "claimed", "collected", "cancelled", "expired"] }).notNull().default("available"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_donations_status_pickup_by").on(table.status, table.pickupBy),
  index("idx_donations_supplier_user_id").on(table.supplierUserId),
]);

export const claims = sqliteTable("claims", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  donationId: integer("donation_id").notNull().references(() => donations.id),
  beneficiaryUserId: text("beneficiary_user_id").notNull(),
  status: text("status", { enum: ["accepted", "collected", "cancelled"] }).notNull().default("accepted"),
  acceptedAt: text("accepted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("claims_donation_unique").on(table.donationId),
  index("idx_claims_beneficiary_user_id").on(table.beneficiaryUserId),
]);

export const communityPosts = sqliteTable("community_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorUserId: text("author_user_id").notNull(),
  donationId: integer("donation_id").references(() => donations.id),
  body: text("body").notNull(),
  imageKey: text("image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_audit_events_created_at").on(table.createdAt),
  index("idx_audit_events_target").on(table.targetType, table.targetId),
]);
