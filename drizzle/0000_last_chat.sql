CREATE TABLE `claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`donation_id` integer NOT NULL,
	`beneficiary_user_id` text NOT NULL,
	`status` text DEFAULT 'accepted' NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claims_donation_unique` ON `claims` (`donation_id`);--> statement-breakpoint
CREATE TABLE `community_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_user_id` text NOT NULL,
	`donation_id` integer,
	`body` text NOT NULL,
	`image_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`donation_id`) REFERENCES `donations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_user_id` text NOT NULL,
	`supplier_name` text NOT NULL,
	`food_description` text NOT NULL,
	`servings` integer NOT NULL,
	`dietary_notes` text DEFAULT '[]' NOT NULL,
	`pickup_address` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`pickup_by` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`safety_confirmed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text,
	`role` text NOT NULL,
	`organization_name` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
