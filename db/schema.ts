import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role", { enum: ["supplier", "beneficiary", "volunteer", "admin"] }).notNull(),
  organizationName: text("organization_name"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
});

export const claims = sqliteTable("claims", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  donationId: integer("donation_id").notNull().references(() => donations.id),
  beneficiaryUserId: text("beneficiary_user_id").notNull(),
  status: text("status", { enum: ["accepted", "collected", "cancelled"] }).notNull().default("accepted"),
  acceptedAt: text("accepted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("claims_donation_unique").on(table.donationId)]);

export const communityPosts = sqliteTable("community_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorUserId: text("author_user_id").notNull(),
  donationId: integer("donation_id").references(() => donations.id),
  body: text("body").notNull(),
  imageKey: text("image_key"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
