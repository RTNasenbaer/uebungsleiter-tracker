CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_user` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expires` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`platform` text NOT NULL,
	`token_hash` text,
	`last_seen_at` text,
	`is_alarm_device` integer DEFAULT false NOT NULL,
	`app_version` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_user` ON `devices` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token_hash` ON `devices` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_one_alarm_device` ON `devices` (`user_id`) WHERE "devices"."is_alarm_device" = 1;--> statement-breakpoint
CREATE TABLE `exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`from_date` text NOT NULL,
	`to_date` text NOT NULL,
	`label` text NOT NULL,
	`series_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exceptions_user` ON `exceptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_provider_user` ON `oauth_accounts` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE TABLE `pairing_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pairing_code_hash` ON `pairing_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `pairing_user` ON `pairing_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_start` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`weekdays` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`interval_weeks` integer DEFAULT 1 NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text,
	`units` integer DEFAULT 1 NOT NULL,
	`pay_cents` integer DEFAULT 1500 NOT NULL,
	`alarm_offset_min` integer DEFAULT 10 NOT NULL,
	`color` text DEFAULT '#2563eb' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `series_user` ON `series` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`occurrence_key` text NOT NULL,
	`series_id` text,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`title` text NOT NULL,
	`team` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`units` integer DEFAULT 1 NOT NULL,
	`pay_cents` integer DEFAULT 1500 NOT NULL,
	`is_override` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`kind` text DEFAULT 'training' NOT NULL,
	`note` text,
	`answered_at` text,
	`answered_via` text,
	`answered_device_id` text,
	`snoozed_until` text,
	`alarm_offset_min` integer DEFAULT 10 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`series_id`) REFERENCES `series`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_user_occurrence` ON `sessions` (`user_id`,`occurrence_key`);--> statement-breakpoint
CREATE INDEX `sessions_user_date` ON `sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `sessions_user_status` ON `sessions` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`iban` text DEFAULT '' NOT NULL,
	`club_name` text DEFAULT '' NOT NULL,
	`report_intro_template` text,
	`report_recipient` text DEFAULT '' NOT NULL,
	`report_deadline` text DEFAULT '12-15' NOT NULL,
	`default_pay_cents` integer DEFAULT 1500 NOT NULL,
	`tax_free_limit_cents` integer DEFAULT 330000 NOT NULL,
	`auto_confirm_after_hours` integer,
	`alarm_sound` text,
	`alarm_vibrate` integer DEFAULT true NOT NULL,
	`alarm_ring_seconds` integer DEFAULT 60 NOT NULL,
	`snooze_minutes` integer DEFAULT 30 NOT NULL,
	`quiet_start` text DEFAULT '22:00',
	`quiet_end` text DEFAULT '07:00',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_id_unique` ON `settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
