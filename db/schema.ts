import { sql } from "drizzle-orm";
import { index, integer, real, pgTable, text, uniqueIndex, serial, boolean, timestamp, bigint } from "drizzle-orm/pg-core";

export const user = pgTable("auth_user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false), image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const session = pgTable("auth_session", {
  id: text("id").primaryKey(), token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(), ipAddress: text("ip_address"), userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const account = pgTable("auth_account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(), providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"), refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"), password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(), updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const verification = pgTable("auth_verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(), createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
export const rateLimit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(), key: text("key").notNull().unique(),
  count: integer("count").notNull(), lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: text("role", { enum: ["supplier", "beneficiary", "volunteer"] }).notNull(),
  organizationName: text("organization_name"),
  phone: text("phone").notNull().default(""),
  city: text("city").notNull().default(""),
  address: text("address").notNull().default(""),
  capacity: integer("capacity").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [index("idx_profiles_verification_status").on(table.verificationStatus)]);

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  supplierUserId: text("supplier_user_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  city: text("city").notNull().default(""),
  foodDescription: text("food_description").notNull(),
  servings: integer("servings").notNull(),
  dietaryNotes: text("dietary_notes").notNull().default("[]"),
  pickupAddress: text("pickup_address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  pickupBy: text("pickup_by").notNull(),
  instructions: text("instructions").notNull().default(""),
  safetyConfirmed: boolean("safety_confirmed").notNull().default(false),
  status: text("status", { enum: ["available", "claimed", "collected", "cancelled", "expired"] }).notNull().default("available"),
  createdAt: text("created_at").notNull().default(sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  index("idx_donations_status_pickup_by").on(table.status, table.pickupBy),
  index("idx_donations_supplier_user_id").on(table.supplierUserId),
]);

export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  donationId: integer("donation_id").notNull().references(() => donations.id),
  beneficiaryUserId: text("beneficiary_user_id").notNull(),
  status: text("status", { enum: ["accepted", "collected", "cancelled"] }).notNull().default("accepted"),
  acceptedAt: text("accepted_at").notNull().default(sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  uniqueIndex("claims_donation_unique").on(table.donationId),
  index("idx_claims_beneficiary_user_id").on(table.beneficiaryUserId),
]);

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  authorUserId: text("author_user_id").notNull(),
  donationId: integer("donation_id").references(() => donations.id),
  body: text("body").notNull(),
  imageKey: text("image_key"),
  status: text("status", { enum: ["pending", "published", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(), title: text("title").notNull(),
  body: text("body").notNull(), href: text("href").notNull().default("/app"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
}, (t) => [index("notification_user_idx").on(t.userId)]);

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(), volunteerId: text("volunteer_id").notNull(),
  organizationName: text("organization_name").notNull(), city: text("city").notNull(),
  contact: text("contact").notNull(), notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["new", "contacted", "onboarded", "closed"] }).notNull().default("new"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const media = pgTable("media", {
  key: text("key").primaryKey(), ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorUserId: text("actor_user_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`),
}, (table) => [
  index("idx_audit_events_created_at").on(table.createdAt),
  index("idx_audit_events_target").on(table.targetType, table.targetId),
]);

export const accountSettings = pgTable("account_settings", {
  userId: text("user_id").primaryKey(),
  latitude: real("latitude"), longitude: real("longitude"),
  radiusKm: integer("radius_km").notNull().default(25),
  emailEnabled: boolean("email_enabled").notNull().default(false),
  pushEnabled: boolean("push_enabled").notNull().default(false),
  revision: integer("revision").notNull().default(0),
});

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(), reporterId: text("reporter_id").notNull(),
  category: text("category").notNull(), description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution").notNull().default(""),
  internalNotes: text("internal_notes").notNull().default(""),
  revision: integer("revision").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const privacyRequests = pgTable("privacy_requests", {
  userId: text("user_id").primaryKey(), status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(), p256dh: text("p256dh").notNull(), auth: text("auth").notNull(),
});

export const notificationDeliveries = pgTable("notification_deliveries", {
  id: serial("id").primaryKey(), notificationId: integer("notification_id").notNull().references(() => notifications.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), channel: text("channel").notNull(), target: integer("target").notNull().default(0),
  status: text("status").notNull().default("pending"), attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
  lease: text("lease"), lastError: text("last_error"),
}, table => [uniqueIndex("delivery_target_unique").on(table.notificationId, table.channel, table.target)]);

export const notificationQueue = pgTable("notification_queue", {
  notificationId: integer("notification_id").primaryKey().references(() => notifications.id, { onDelete: "cascade" }),
});

export const pickupReminders = pgTable("pickup_reminders", {
  donationId: integer("donation_id").primaryKey().references(() => donations.id),
});
