CREATE TABLE `my_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`birthday` text,
	`birthday_year_known` integer DEFAULT false,
	`about` text,
	`contact_preference` text
);
