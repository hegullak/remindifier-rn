import { getDbForUser } from "@/db/client";

const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS app_meta (
     key TEXT PRIMARY KEY NOT NULL,
     value TEXT NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS people (
     id TEXT PRIMARY KEY NOT NULL,
     display_name TEXT NOT NULL,
     relation_type TEXT,
     birthday TEXT,
     birthday_year_known INTEGER NOT NULL DEFAULT 1,
     is_sensitive INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS person_fun_facts (
     id TEXT PRIMARY KEY NOT NULL,
     person_id TEXT NOT NULL,
     fact TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
   );`,
  `CREATE TABLE IF NOT EXISTS person_red_letter_days (
     id TEXT PRIMARY KEY NOT NULL,
     person_id TEXT,
     kind TEXT NOT NULL CHECK (kind IN ('Birthday', 'Anniversary', 'Smoke-free', 'Snus-free', 'Other')),
     label TEXT,
     event_date TEXT NOT NULL,
     year_known INTEGER NOT NULL DEFAULT 1,
     recurring INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
   );`,
  `CREATE TABLE IF NOT EXISTS person_notes (
     id TEXT PRIMARY KEY NOT NULL,
     person_id TEXT NOT NULL,
     entry_type TEXT NOT NULL CHECK (entry_type IN ('note', 'follow_up')),
     body TEXT NOT NULL,
     occurred_at TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
   );`,
  `CREATE TABLE IF NOT EXISTS relationships (
     id TEXT PRIMARY KEY NOT NULL,
     from_person_id TEXT NOT NULL,
     to_person_id TEXT NOT NULL,
     label TEXT NOT NULL,
     notes TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (from_person_id) REFERENCES people(id) ON DELETE CASCADE,
     FOREIGN KEY (to_person_id) REFERENCES people(id) ON DELETE CASCADE
   );`,
  `CREATE TABLE IF NOT EXISTS gatherings (
     id TEXT PRIMARY KEY NOT NULL,
     title TEXT NOT NULL,
     starts_at TEXT NOT NULL,
     location TEXT,
     notes TEXT,
     created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
   );`,
  `CREATE TABLE IF NOT EXISTS gathering_people (
     id TEXT PRIMARY KEY NOT NULL,
     gathering_id TEXT NOT NULL,
     person_id TEXT NOT NULL,
     FOREIGN KEY (gathering_id) REFERENCES gatherings(id) ON DELETE CASCADE,
     FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
   );`,
  `CREATE TABLE IF NOT EXISTS brief_red_letter_days (
     id TEXT PRIMARY KEY NOT NULL,
     person_name TEXT NOT NULL,
     headline TEXT NOT NULL,
     timing TEXT NOT NULL
   );`,
  `CREATE TABLE IF NOT EXISTS brief_schedule (
     id TEXT PRIMARY KEY NOT NULL,
     time_label TEXT NOT NULL,
     title TEXT NOT NULL,
     note TEXT NOT NULL
   );`,
  `CREATE INDEX IF NOT EXISTS people_name_idx ON people(display_name);`,
  `CREATE INDEX IF NOT EXISTS red_letter_event_idx ON person_red_letter_days(event_date);`,
  `CREATE INDEX IF NOT EXISTS notes_person_occurred_idx ON person_notes(person_id, occurred_at DESC);`,
  `CREATE INDEX IF NOT EXISTS rel_from_idx ON relationships(from_person_id);`,
  `CREATE INDEX IF NOT EXISTS rel_to_idx ON relationships(to_person_id);`,
  `CREATE INDEX IF NOT EXISTS gathering_starts_idx ON gatherings(starts_at);`,
];

const CURRENT_SCHEMA_VERSION = 2;

async function getVersion(userId: string) {
  const db = await getDbForUser(userId);
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'schemaVersion'",
  );
  return Number(row?.value ?? "0");
}

async function setVersion(userId: string, version: number) {
  const db = await getDbForUser(userId);
  await db.runAsync(
    `INSERT INTO app_meta (key, value) VALUES ('schemaVersion', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    String(version),
  );
}

export async function runMigrations(userId: string) {
  const db = await getDbForUser(userId);
  const version = await getVersion(userId);
  if (version >= CURRENT_SCHEMA_VERSION) return;

  for (const sql of MIGRATIONS) {
    await db.execAsync(sql);
  }
  await setVersion(userId, CURRENT_SCHEMA_VERSION);
}
