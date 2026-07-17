const migrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: 1779973512401,
        tag: "0000_aromatic_doctor_doom",
        breakpoints: true,
      },
      {
        idx: 1,
        when: 1780001310043,
        tag: "0001_lean_tinkerer",
        breakpoints: true,
      },
      {
        idx: 2,
        when: 1781116871064,
        tag: "0002_known_albert_cleary",
        breakpoints: true,
      },
      {
        idx: 3,
        when: 1783712107217,
        tag: "0003_clumsy_thundra",
        breakpoints: true,
      },
      {
        idx: 4,
        when: 1784288317870,
        tag: "0004_silky_impossible_man",
        breakpoints: true,
      },
      {
        idx: 5,
        when: 1784315429096,
        tag: "0005_hesitant_pestilence",
        breakpoints: true,
      },
      {
        idx: 6,
        when: 1784316524726,
        tag: "0006_eminent_annihilus",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: `CREATE TABLE \`brief_red_letter_days\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`person_name\` text NOT NULL,
	\`headline\` text NOT NULL,
	\`timing\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`brief_schedule\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`time_label\` text NOT NULL,
	\`title\` text NOT NULL,
	\`note\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`gathering_participants\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`gathering_id\` text NOT NULL,
	\`person_id\` text NOT NULL,
	\`user_id\` text NOT NULL,
	\`tonight_mode_active\` integer DEFAULT false NOT NULL,
	\`notes\` text,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`gathering_id\`) REFERENCES \`gatherings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`person_id\`) REFERENCES \`persons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`gathering_participants_unique\` ON \`gathering_participants\` (\`gathering_id\`,\`person_id\`);--> statement-breakpoint
CREATE INDEX \`gathering_participants_gathering_idx\` ON \`gathering_participants\` (\`gathering_id\`);--> statement-breakpoint
CREATE INDEX \`gathering_participants_person_idx\` ON \`gathering_participants\` (\`user_id\`,\`person_id\`);--> statement-breakpoint
CREATE TABLE \`gatherings\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`title\` text NOT NULL,
	\`description\` text,
	\`scheduled_at\` integer,
	\`location\` text,
	\`type\` text DEFAULT 'other' NOT NULL,
	\`status\` text DEFAULT 'planned' NOT NULL,
	\`conversation_logged_at\` integer,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`gatherings_user_idx\` ON \`gatherings\` (\`user_id\`,\`scheduled_at\`);--> statement-breakpoint
CREATE INDEX \`gatherings_status_idx\` ON \`gatherings\` (\`user_id\`,\`status\`);--> statement-breakpoint
CREATE TABLE \`person_entries\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`person_id\` text,
	\`entry_type\` text DEFAULT 'context' NOT NULL,
	\`body\` text NOT NULL,
	\`body_encrypted\` text,
	\`raw_input\` text,
	\`occurred_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`person_id\`) REFERENCES \`persons\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`person_entries_person_idx\` ON \`person_entries\` (\`user_id\`,\`person_id\`,\`occurred_at\`);--> statement-breakpoint
CREATE INDEX \`person_entries_recent_idx\` ON \`person_entries\` (\`user_id\`,\`occurred_at\`);--> statement-breakpoint
CREATE TABLE \`person_red_letter_days\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`person_id\` text NOT NULL,
	\`kind\` text NOT NULL,
	\`label\` text,
	\`event_date\` text NOT NULL,
	\`year_known\` integer DEFAULT true NOT NULL,
	\`recurring\` integer DEFAULT true NOT NULL,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`person_id\`) REFERENCES \`persons\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`person_red_letter_days_person_idx\` ON \`person_red_letter_days\` (\`user_id\`,\`person_id\`);--> statement-breakpoint
CREATE INDEX \`person_red_letter_days_date_idx\` ON \`person_red_letter_days\` (\`user_id\`,\`event_date\`);--> statement-breakpoint
CREATE TABLE \`persons\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`display_name\` text NOT NULL,
	\`nickname\` text,
	\`birthday\` text,
	\`birthday_year_known\` integer DEFAULT true NOT NULL,
	\`relation_type\` text,
	\`interests\` text DEFAULT '[]' NOT NULL,
	\`preferences\` text DEFAULT '{}' NOT NULL,
	\`anniversary\` text,
	\`sensitive_topics\` text DEFAULT '[]' NOT NULL,
	\`last_interaction_at\` integer,
	\`archived\` integer DEFAULT false NOT NULL,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`persons_user_idx\` ON \`persons\` (\`user_id\`,\`archived\`,\`display_name\`);--> statement-breakpoint
CREATE INDEX \`persons_birthday_idx\` ON \`persons\` (\`user_id\`,\`birthday\`);--> statement-breakpoint
CREATE INDEX \`persons_last_interaction_idx\` ON \`persons\` (\`user_id\`,\`last_interaction_at\`);--> statement-breakpoint
CREATE TABLE \`relationships\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`from_person_id\` text NOT NULL,
	\`to_person_id\` text NOT NULL,
	\`label\` text NOT NULL,
	\`notes\` text,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`from_person_id\`) REFERENCES \`persons\`(\`id\`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (\`to_person_id\`) REFERENCES \`persons\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`relationships_unique_directed\` ON \`relationships\` (\`user_id\`,\`from_person_id\`,\`to_person_id\`,\`label\`);--> statement-breakpoint
CREATE INDEX \`relationships_from_idx\` ON \`relationships\` (\`user_id\`,\`from_person_id\`);--> statement-breakpoint
CREATE INDEX \`relationships_to_idx\` ON \`relationships\` (\`user_id\`,\`to_person_id\`);--> statement-breakpoint
CREATE TABLE \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`email\` text NOT NULL,
	\`display_name\` text,
	\`timezone\` text DEFAULT 'Europe/Oslo' NOT NULL,
	\`intensity\` text DEFAULT 'standard' NOT NULL,
	\`morning_brief_enabled\` integer DEFAULT true NOT NULL,
	\`morning_brief_time\` text DEFAULT '06:00:00' NOT NULL,
	\`consent_accepted_at\` integer,
	\`brief_preferences\` text DEFAULT '{}' NOT NULL,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL
);`,
    m0001: `CREATE TABLE \`my_profile\` (
	\`user_id\` text PRIMARY KEY NOT NULL,
	\`display_name\` text NOT NULL,
	\`birthday\` text,
	\`birthday_year_known\` integer DEFAULT false,
	\`about\` text,
	\`contact_preference\` text
);`,
    m0002: `CREATE TABLE \`daily_look_forward\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`date\` text NOT NULL,
	\`text\` text,
	\`dismissed\` integer DEFAULT false NOT NULL,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`daily_look_forward_user_date\` ON \`daily_look_forward\` (\`user_id\`,\`date\`);`,
    m0003: `CREATE TABLE \`calendar_sync_events\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`source_calendar_id\` text NOT NULL,
	\`source_event_id\` text NOT NULL,
	\`echo_event_id\` text NOT NULL,
	\`signature\` text NOT NULL,
	\`updated_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`calendar_sync_events_source_unique\` ON \`calendar_sync_events\` (\`user_id\`,\`source_event_id\`);--> statement-breakpoint
CREATE INDEX \`calendar_sync_events_calendar_idx\` ON \`calendar_sync_events\` (\`user_id\`,\`source_calendar_id\`);--> statement-breakpoint
CREATE TABLE \`calendar_sync_links\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`source_calendar_id\` text NOT NULL,
	\`source_calendar_title\` text NOT NULL,
	\`last_synced_at\` integer,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`calendar_sync_links_user_source\` ON \`calendar_sync_links\` (\`user_id\`,\`source_calendar_id\`);`,
    m0004: `CREATE TABLE \`intentions\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`user_id\` text NOT NULL,
	\`text\` text NOT NULL,
	\`due_by\` text NOT NULL,
	\`completed_at\` integer,
	\`dismissed_at\` integer,
	\`created_at\` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX \`intentions_user_due_idx\` ON \`intentions\` (\`user_id\`,\`due_by\`);`,
    m0005: `ALTER TABLE \`intentions\` ADD \`notes\` text;`,
    m0006: `ALTER TABLE \`intentions\` ADD \`after_note\` text;`,
  },
};

export default migrations;
