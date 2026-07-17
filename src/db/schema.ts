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
    .$type<UserBriefPreferences>()
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
    uniqueIndex("relationships_unique_directed").on(
      t.userId,
      t.fromPersonId,
      t.toPersonId,
      t.label,
    ),
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
  (t) => [
    index("gatherings_user_idx").on(t.userId, t.scheduledAt),
    index("gatherings_status_idx").on(t.userId, t.status),
  ],
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

/** One optional «looking forward to today» line per user per local calendar day. */
export const dailyLookForward = sqliteTable(
  "daily_look_forward",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    text: text("text"),
    dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("daily_look_forward_user_date").on(t.userId, t.date)],
);

/**
 * Tracks which device calendars are mirrored into the app-owned "echoflow"
 * device calendar, and per-event mapping so re-sync can diff cheaply.
 * Assumes one physical device == one active app user (local-first model);
 * the underlying device calendar is OS-level and not itself partitioned
 * per user database.
 */
export const calendarSyncLinks = sqliteTable(
  "calendar_sync_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceCalendarId: text("source_calendar_id").notNull(),
    sourceCalendarTitle: text("source_calendar_title").notNull(),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("calendar_sync_links_user_source").on(t.userId, t.sourceCalendarId)],
);

export const calendarSyncEvents = sqliteTable(
  "calendar_sync_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceCalendarId: text("source_calendar_id").notNull(),
    sourceEventId: text("source_event_id").notNull(),
    echoEventId: text("echo_event_id").notNull(),
    /** Canonical join of title/notes/location/start/end/allDay — cheap change detection, not a hash. */
    signature: text("signature").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    uniqueIndex("calendar_sync_events_source_unique").on(t.userId, t.sourceEventId),
    index("calendar_sync_events_calendar_idx").on(t.userId, t.sourceCalendarId),
  ],
);

/**
 * A loose intention with a time horizon — "something I want to get done within
 * this week". Distinct from gatherings (firm calendar events) and person
 * follow-ups (tied to an existing person). Surfaced softly in the flow-summary
 * when the day has room; never nags.
 */
export const intentions = sqliteTable(
  "intentions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    /** Local date (YYYY-MM-DD) the intention should be done by. */
    dueBy: text("due_by").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    dismissedAt: integer("dismissed_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("intentions_user_due_idx").on(t.userId, t.dueBy)],
);

export const myProfile = sqliteTable("my_profile", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  birthday: text("birthday"),
  birthdayYearKnown: integer("birthday_year_known", { mode: "boolean" }).default(false),
  about: text("about"),
  contactPreference: text("contact_preference"),
});

export type UserBriefPreferences = {
  sectionOrder?: string[];
  onboardingCompletedAt?: number;
  /** Device calendar IDs included in the brief (read-only). Omitted = all calendars. */
  selectedCalendarIds?: string[];
};

export type Person = typeof persons.$inferSelect;
export type Intention = typeof intentions.$inferSelect;
export type MyProfile = typeof myProfile.$inferSelect;
export type CalendarSyncLink = typeof calendarSyncLinks.$inferSelect;
export type CalendarSyncEvent = typeof calendarSyncEvents.$inferSelect;
