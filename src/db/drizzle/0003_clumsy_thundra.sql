CREATE TABLE `calendar_sync_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_calendar_id` text NOT NULL,
	`source_event_id` text NOT NULL,
	`echo_event_id` text NOT NULL,
	`signature` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_sync_events_source_unique` ON `calendar_sync_events` (`user_id`,`source_event_id`);--> statement-breakpoint
CREATE INDEX `calendar_sync_events_calendar_idx` ON `calendar_sync_events` (`user_id`,`source_calendar_id`);--> statement-breakpoint
CREATE TABLE `calendar_sync_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_calendar_id` text NOT NULL,
	`source_calendar_title` text NOT NULL,
	`last_synced_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_sync_links_user_source` ON `calendar_sync_links` (`user_id`,`source_calendar_id`);