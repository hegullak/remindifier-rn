import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { personEntries, personRedLetterDays, persons, relationships } from "@/db/schema";
import { logger } from "@/lib/logger";
import type { RedLetterDayInput } from "@/lib/red-letter-day";
import { normalizeRedLetterDay } from "@/lib/red-letter-day";
import { logRepoError } from "@/lib/repoLog";

export interface PersonSummary {
  id: string;
  displayName: string;
  relationType: string | null;
  birthday: string | null;
  birthdayYearKnown: boolean;
  lastInteractionAt: Date | null;
  archived: boolean;
}

export interface PersonRelationshipLink {
  id: string;
  direction: "outgoing" | "incoming";
  label: string;
  otherPersonId: string;
  otherPersonName: string;
  notes: string | null;
}

export interface UpsertPersonInput {
  displayName: string;
  relationType?: string | null;
  birthday?: string | null;
  birthdayYearKnown?: boolean;
  isSensitive?: boolean;
  funFacts?: string[];
  redLetterDays?: RedLetterDayInput[];
}

export interface CreatePersonEntryInput {
  personId: string;
  type: "note" | "follow_up";
  body: string;
  occurredAt?: Date;
}

export async function listPeopleSummaries(userId: string): Promise<PersonSummary[]> {
  const db = await getDrizzleDbForUser(userId);
  return db
    .select({
      id: persons.id,
      displayName: persons.displayName,
      relationType: persons.relationType,
      birthday: persons.birthday,
      birthdayYearKnown: persons.birthdayYearKnown,
      lastInteractionAt: persons.lastInteractionAt,
      archived: persons.archived,
    })
    .from(persons)
    .where(eq(persons.userId, userId))
    .orderBy(asc(persons.archived), asc(persons.displayName));
}

export async function getPersonById(userId: string, personId: string) {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.userId, userId), eq(persons.id, personId)))
    .limit(1);
  return row ?? null;
}

export async function listPersonRedLetterDays(userId: string, personId: string) {
  const db = await getDrizzleDbForUser(userId);
  return db
    .select({
      id: personRedLetterDays.id,
      kind: personRedLetterDays.kind,
      label: personRedLetterDays.label,
      eventDate: personRedLetterDays.eventDate,
      yearKnown: personRedLetterDays.yearKnown,
      recurring: personRedLetterDays.recurring,
    })
    .from(personRedLetterDays)
    .where(and(eq(personRedLetterDays.userId, userId), eq(personRedLetterDays.personId, personId)))
    .orderBy(asc(personRedLetterDays.eventDate));
}

export async function listPersonTimeline(userId: string, personId: string) {
  const db = await getDrizzleDbForUser(userId);
  return db
    .select({
      id: personEntries.id,
      entryType: personEntries.entryType,
      body: personEntries.body,
      occurredAt: personEntries.occurredAt,
      createdAt: personEntries.createdAt,
    })
    .from(personEntries)
    .where(and(eq(personEntries.userId, userId), eq(personEntries.personId, personId)))
    .orderBy(desc(personEntries.occurredAt));
}

export async function listPersonRelationships(
  userId: string,
  personId: string,
): Promise<PersonRelationshipLink[]> {
  const db = await getDrizzleDbForUser(userId);

  const outgoing = await db
    .select({
      id: relationships.id,
      label: relationships.label,
      notes: relationships.notes,
      otherPersonId: persons.id,
      otherPersonName: persons.displayName,
    })
    .from(relationships)
    .innerJoin(persons, eq(relationships.toPersonId, persons.id))
    .where(and(eq(relationships.userId, userId), eq(relationships.fromPersonId, personId)));

  const incoming = await db
    .select({
      id: relationships.id,
      label: relationships.label,
      notes: relationships.notes,
      otherPersonId: persons.id,
      otherPersonName: persons.displayName,
    })
    .from(relationships)
    .innerJoin(persons, eq(relationships.fromPersonId, persons.id))
    .where(and(eq(relationships.userId, userId), eq(relationships.toPersonId, personId)));

  return [
    ...outgoing.map((row) => ({ ...row, direction: "outgoing" as const })),
    ...incoming.map((row) => ({ ...row, direction: "incoming" as const })),
  ].sort((a, b) => a.otherPersonName.localeCompare(b.otherPersonName));
}

export async function getPersonProfileBundle(userId: string, personId: string) {
  const [person, redLetterDays, timeline, links] = await Promise.all([
    getPersonById(userId, personId),
    listPersonRedLetterDays(userId, personId),
    listPersonTimeline(userId, personId),
    listPersonRelationships(userId, personId),
  ]);

  if (!person) return null;
  return { person, redLetterDays, timeline, links };
}

async function upsertRedLetterDays(userId: string, personId: string, days: RedLetterDayInput[]) {
  const db = await getDrizzleDbForUser(userId);
  const normalized = days.map(normalizeRedLetterDay);

  if (normalized.length === 0) {
    await db
      .delete(personRedLetterDays)
      .where(
        and(eq(personRedLetterDays.userId, userId), eq(personRedLetterDays.personId, personId)),
      );
    return;
  }

  const existingIds = normalized.filter((d) => d.id).map((d) => d.id as string);

  if (existingIds.length > 0) {
    await db
      .delete(personRedLetterDays)
      .where(
        and(
          eq(personRedLetterDays.userId, userId),
          eq(personRedLetterDays.personId, personId),
          notInArray(personRedLetterDays.id, existingIds),
        ),
      );
  } else {
    await db
      .delete(personRedLetterDays)
      .where(
        and(eq(personRedLetterDays.userId, userId), eq(personRedLetterDays.personId, personId)),
      );
  }

  for (const day of normalized) {
    const payload = {
      kind: day.kind,
      label: day.label,
      eventDate: day.eventDate,
      yearKnown: day.yearKnown,
      recurring: day.recurring,
      updatedAt: new Date(),
    };
    if (day.id) {
      await db
        .update(personRedLetterDays)
        .set(payload)
        .where(
          and(
            eq(personRedLetterDays.userId, userId),
            eq(personRedLetterDays.personId, personId),
            eq(personRedLetterDays.id, day.id),
          ),
        );
    } else {
      await db.insert(personRedLetterDays).values({
        id: `rld-${Crypto.randomUUID()}`,
        userId,
        personId,
        ...payload,
      });
    }
  }
}

export async function createPerson(userId: string, input: UpsertPersonInput) {
  try {
    const db = await getDrizzleDbForUser(userId);
    const id = `p-${Crypto.randomUUID()}`;
    await db.insert(persons).values({
      id,
      userId,
      displayName: input.displayName.trim(),
      relationType: input.relationType?.trim() || null,
      birthday: input.birthday || null,
      birthdayYearKnown: input.birthdayYearKnown ?? true,
      archived: false,
      sensitiveTopics: input.isSensitive ? ["handle_with_care"] : [],
      interests: input.funFacts ?? [],
    });
    if (input.redLetterDays) {
      await upsertRedLetterDays(userId, id, input.redLetterDays);
    }
    logger.info("person_created", { userId, personId: id });
    return id;
  } catch (err) {
    logRepoError("person_create_failed", err, { userId });
  }
}

export async function updatePerson(userId: string, personId: string, input: UpsertPersonInput) {
  try {
    const db = await getDrizzleDbForUser(userId);
    await db
      .update(persons)
      .set({
        displayName: input.displayName.trim(),
        relationType: input.relationType?.trim() || null,
        birthday: input.birthday || null,
        birthdayYearKnown: input.birthdayYearKnown ?? true,
        sensitiveTopics: input.isSensitive ? ["handle_with_care"] : [],
        interests: input.funFacts ?? [],
        updatedAt: new Date(),
      })
      .where(and(eq(persons.userId, userId), eq(persons.id, personId)));
    if (input.redLetterDays) {
      await upsertRedLetterDays(userId, personId, input.redLetterDays);
    }
    logger.info("person_updated", { userId, personId });
  } catch (err) {
    logRepoError("person_update_failed", err, { userId, personId });
  }
}

export async function deletePerson(userId: string, personId: string) {
  try {
    const db = await getDrizzleDbForUser(userId);
    await db.delete(persons).where(and(eq(persons.userId, userId), eq(persons.id, personId)));
    logger.info("person_deleted", { userId, personId });
  } catch (err) {
    logRepoError("person_delete_failed", err, { userId, personId });
  }
}

export async function createPersonEntry(userId: string, input: CreatePersonEntryInput) {
  try {
    const db = await getDrizzleDbForUser(userId);
    const id = `e-${Crypto.randomUUID()}`;
    const entryType = input.type === "note" ? "context" : "follow_up";
    const occurredAt = input.occurredAt ?? new Date();

    await db.insert(personEntries).values({
      id,
      userId,
      personId: input.personId,
      entryType,
      body: input.body.trim(),
      rawInput: input.body.trim(),
      occurredAt,
    });

    if (entryType === "context") {
      await db
        .update(persons)
        .set({ lastInteractionAt: occurredAt, updatedAt: new Date() })
        .where(and(eq(persons.userId, userId), eq(persons.id, input.personId)));
    }

    logger.info("person_entry_created", { userId, personId: input.personId, entryId: id });
    return id;
  } catch (err) {
    logRepoError("person_entry_create_failed", err, { userId, personId: input.personId });
  }
}

export async function deletePersonEntry(userId: string, entryId: string) {
  try {
    const db = await getDrizzleDbForUser(userId);
    const [deleted] = await db
      .delete(personEntries)
      .where(and(eq(personEntries.userId, userId), eq(personEntries.id, entryId)))
      .returning();
    logger.info("person_entry_deleted", { userId, entryId });
    return deleted ?? null;
  } catch (err) {
    logRepoError("person_entry_delete_failed", err, { userId, entryId });
  }
}
