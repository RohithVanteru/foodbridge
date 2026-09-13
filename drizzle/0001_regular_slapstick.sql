ALTER TABLE `profiles` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `capacity` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_profiles_verification_status` ON `profiles` (`verification_status`);--> statement-breakpoint
CREATE INDEX `idx_claims_beneficiary_user_id` ON `claims` (`beneficiary_user_id`);--> statement-breakpoint
CREATE INDEX `idx_donations_status_pickup_by` ON `donations` (`status`,`pickup_by`);--> statement-breakpoint
CREATE INDEX `idx_donations_supplier_user_id` ON `donations` (`supplier_user_id`);