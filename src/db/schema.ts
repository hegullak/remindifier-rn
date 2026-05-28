import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * SQLite-adapted schema mapped from the web Postgres schema.
 * Key adaptations:
 * - jsonb -> text(..., { mode: "json" })
 * - timestamptz -> integer(..., { mode: "timestamp_ms" })
 * - uuid -> text primary keys
 */

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("Europe/Oslo"),
  intensity: text("intensity", { enum: ["zen", "standard", "hissig"] })
    .notNull()
    .default("standard"),
  morningBriefEnabled: integer("morning_brief_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  morningBriefTime: text("morning_brief_time").notNull().default("06:00:00"),
  consentAcceptedAt: integer("consent_accepted_at", { mode: "timestamp_ms" }),
  briefPreferences: text("brief_preferences", { mode: "json" })
    .$type<{ sectionOrder?: string[] }>()
    .notNull()
    .default(sql`'{}'`),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const persons = sqliteTable(
  "persons",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    nickname: text("nickname"),
    birthday: text("birthday"),
    birthdayYearKnown: integer("birthday_year_known", { mode: "boolean" }).notNull().default(true),
    relationType: text("relation_type"),
    interests: text("interests", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    preferences: text("preferences", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    anniversary: text("anniversary"),
    sensitiveTopics: text("sensitive_topics", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    lastInteractionAt: integer("last_interaction_at", { mode: "timestamp_ms" }),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("persons_user_idx").on(t.userId, t.archived, t.displayName),
    index("persons_birthday_idx").on(t.userId, t.birthday),
    index("persons_last_interaction_idx").on(t.userId, t.lastInteractionAt),
  ],
);

export const relationships = sqliteTable(
  "relationships",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromPersonId: text("from_person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    toPersonId: text("to_person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("relationships_unique_directed").on(t.userId, t.fromPersonId, t.toPersonId, t.label),
    index("relationships_from_idx").on(t.userId, t.fromPersonId),
    index("relationships_to_idx").on(t.userId, t.toPersonId),
  ],
);

export const personEntries = sqliteTable(
  "person_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: text("person_id").references(() => persons.id, { onDelete: "cascade" }),
    entryType: text("entry_type", { enum: ["context", "interaction", "follow_up"] })
      .notNull()
      .default("context"),
    body: text("body").notNull(),
    bodyEncrypted: text("body_encrypted"),
    rawInput: text("raw_input"),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("person_entries_person_idx").on(t.userId, t.personId, t.occurredAt),
    index("person_entries_recent_idx").on(t.userId, t.occurredAt),
  ],
);

export const gatherings = sqliteTable(
  "gatherings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    location: text("location"),
    type: text("type", { enum: ["dinner", "party", "trip", "drinks", "work", "other"] })
      .notNull()
      .default("other"),
    status: text("status", { enum: ["planned", "active", "completed", "cancelled"] })
      .notNull()
      .default("planned"),
    conversationLoggedAt: integer("conversation_logged_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("gatherings_user_idx").on(t.userId, t.scheduledAt), index("gatherings_status_idx").on(t.userId, t.status)],
);

export const gatheringParticipants = sqliteTable(
  "gathering_participants",
  {
    id: text("id").primaryKey(),
    gatheringId: text("gathering_id")
      .notNull()
      .references(() => gatherings.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tonightModeActive: integer("tonight_mode_active", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("gathering_participants_unique").on(t.gatheringId, t.personId),
    index("gathering_participants_gathering_idx").on(t.gatheringId),
    index("gathering_participants_person_idx").on(t.userId, t.personId),
  ],
);

export const personRedLetterDays = sqliteTable(
  "person_red_letter_days",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => persons.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    label: text("label"),
    eventDate: text("event_date").notNull(),
    yearKnown: integer("year_known", { mode: "boolean" }).notNull().default(true),
    recurring: integer("recurring", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("person_red_letter_days_person_idx").on(t.userId, t.personId),
    index("person_red_letter_days_date_idx").on(t.userId, t.eventDate),
  ],
);

export const briefSchedule = sqliteTable("brief_schedule", {
  id: text("id").primaryKey(),
  timeLabel: text("time_label").notNull(),
  title: text("title").notNull(),
  note: text("note").notNull(),
});

export const briefRedLetterDays = sqliteTable("brief_red_letter_days", {
  id: text("id").primaryKey(),
  personName: text("person_name").notNull(),
  headline: text("headline").notNull(),
  timing: text("timing").notNull(),
});

export type Person = typeof persons.$inferSelect;
