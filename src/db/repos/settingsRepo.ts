import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type * as schema from "@/db/schema";
import {
  type MyProfile,
  myProfile,
  type Person,
  personEntries,
  personRedLetterDays,
  persons,
  relationships,
} from "@/db/schema";
import { logger } from "@/lib/logger";
import { clearLogFiles } from "@/lib/logUtils";
import { logRepoError } from "@/lib/repoLog";

type PersonEntry = typeof personEntries.$inferSelect;
type PersonRedLetterDay = typeof personRedLetterDays.$inferSelect;
type Relationship = typeof relationships.$inferSelect;

export type ExportPayload = {
  exportedAt: string;
  version: 1;
  people: Person[];
  timeline: PersonEntry[];
  redLetterDays: PersonRedLetterDay[];
  relationships: Relationship[];
  myProfile: MyProfile | null;
};

function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row };
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (value instanceof Date) {
      (out as Record<string, unknown>)[key] = value.toISOString();
    }
  }
  return out;
}

export async function exportAllData(db: ExpoSQLiteDatabase<typeof schema>): Promise<ExportPayload> {
  try {
    const [people, timeline, redLetterDays, relationshipRows, profileRows] = await Promise.all([
      db.select().from(persons),
      db.select().from(personEntries),
      db.select().from(personRedLetterDays),
      db.select().from(relationships),
      db.select().from(myProfile),
    ]);

    logger.info("data_export_succeeded", {
      peopleCount: people.length,
      timelineCount: timeline.length,
    });

    return {
      exportedAt: new Date().toISOString(),
      version: 1,
      people: people.map((row) => serializeRow(row)),
      timeline: timeline.map((row) => serializeRow(row)),
      redLetterDays: redLetterDays.map((row) => serializeRow(row)),
      relationships: relationshipRows.map((row) => serializeRow(row)),
      myProfile: profileRows[0] ? serializeRow(profileRows[0]) : null,
    };
  } catch (err) {
    logRepoError("data_export_failed", err);
  }
}

export async function deleteAllData(db: ExpoSQLiteDatabase<typeof schema>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(personEntries);
      await tx.delete(personRedLetterDays);
      await tx.delete(relationships);
      await tx.delete(persons);
      await tx.delete(myProfile);
    });
    await clearLogFiles();
    logger.info("all_data_deleted");
  } catch (err) {
    logRepoError("all_data_delete_failed", err);
  }
}
