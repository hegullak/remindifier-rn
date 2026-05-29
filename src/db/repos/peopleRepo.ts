import { and, asc, desc, eq, notInArray, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { gatheringParticipants, gatherings, personEntries, personRedLetterDays, persons, relationships } from "@/db/schema";
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
  nextRedLetterDayLabel: string | null;
  nextRedLetterDaysUntil: number | null;
  nextGatheringTitle: string | null;
  nextGatheringDaysUntil: number | null;
  firstFollowUpBody: string | null;
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
  const baseRows = await db
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

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const enriched = await Promise.all(
    baseRows.map(async (row) => {
      // Next red-letter day within 14 days
      const redLetters = await db
        .select({
          kind: personRedLetterDays.kind,
          label: personRedLetterDays.label,
          eventDate: personRedLetterDays.eventDate,
        })
        .from(personRedLetterDays)
        .where(
          and(
            eq(personRedLetterDays.userId, userId),
            eq(personRedLetterDays.personId, row.id),
          ),
        )
        .orderBy(asc(personRedLetterDays.eventDate));

      let nextRedLetterDayLabel: string | null = null;
      let nextRedLetterDaysUntil: number | null = null;
      for (const r of redLetters) {
        const eventDate = new Date(r.eventDate);
        const daysUntil = Math.floor((eventDate.getTime() - now.getTime()) / 86400000);
        if (daysUntil >= 0 && daysUntil <= 14) {
          nextRedLetterDayLabel = r.label || r.kind;
          nextRedLetterDaysUntil = daysUntil;
          break;
        }
      }

      // Next gathering within 14 days
      const participantRows = await db
        .select({ gatheringId: gatheringParticipants.gatheringId })
        .from(gatheringParticipants)
        .where(
          and(
            eq(gatheringParticipants.userId, userId),
            eq(gatheringParticipants.personId, row.id),
          ),
        );
      let nextGatheringTitle: string | null = null;
      let nextGatheringDaysUntil: number | null = null;
      if (participantRows.length > 0) {
        const gatheringRows = await db
          .select({
            title: gatherings.title,
            scheduledAt: gatherings.scheduledAt,
          })
          .from(gatherings)
          .where(
            and(
              eq(gatherings.userId, userId),
              inArray(
                gatherings.id,
                participantRows.map((p) => p.gatheringId),
              ),
            ),
          )
          .orderBy(asc(gatherings.scheduledAt));
        for (const g of gatheringRows) {
          if (!g.scheduledAt) continue;
          const daysUntil = Math.floor(
            (g.scheduledAt.getTime() - now.getTime()) / 86400000,
          );
          if (daysUntil >= 0 && daysUntil <= 14) {
            nextGatheringTitle = g.title;
            nextGatheringDaysUntil = daysUntil;
            break;
          }
        }
      }

      // First follow-up note
      const [followUp] = await db
        .select({ body: personEntries.body })
        .from(personEntries)
        .where(
          and(
            eq(personEntries.userId, userId),
            eq(personEntries.personId, row.id),
            eq(personEntries.entryType, "follow_up"),
          ),
        )
        .orderBy(desc(personEntries.occurredAt))
        .limit(1);

      return {
        ...row,
        nextRedLetterDayLabel,
        nextRedLetterDaysUntil,
        nextGatheringTitle,
        nextGatheringDaysUntil,
        firstFollowUpBody: followUp?.body ?? null,
      };
    }),
  );

  return enriched;
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

async function listPersonGatherings(userId: string, personId: string) {
  const db = await getDrizzleDbForUser(userId);
  const participantRows = await db
    .select({ gatheringId: gatheringParticipants.gatheringId })
    .from(gatheringParticipants)
    .where(
      and(eq(gatheringParticipants.userId, userId), eq(gatheringParticipants.personId, personId)),
    );
  if (participantRows.length === 0) return [];
  const ids = participantRows.map((r) => r.gatheringId);
  return db
    .select({
      id: gatherings.id,
      title: gatherings.title,
      description: gatherings.description,
      scheduledAt: gatherings.scheduledAt,
      status: gatherings.status,
    })
    .from(gatherings)
    .where(and(eq(gatherings.userId, userId), inArray(gatherings.id, ids)))
    .orderBy(desc(gatherings.scheduledAt));
}

export async function getPersonProfileBundle(userId: string, personId: string) {
  const [person, redLetterDays, timeline, links, personGatherings] = await Promise.all([
    getPersonById(userId, personId),
    listPersonRedLetterDays(userId, personId),
    listPersonTimeline(userId, personId),
    listPersonRelationships(userId, personId),
    listPersonGatherings(userId, personId),
  ]);

  if (!person) return null;
  return { person, redLetterDays, timeline, links, gatherings: personGatherings };
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
    const redLetterDays = [...(input.redLetterDays ?? [])];
    // Auto-add birthday as a red-letter day if not already present
    if (input.birthday && !redLetterDays.some((d) => d.kind === "Birthday")) {
      redLetterDays.push({
        kind: "Birthday",
        label: null,
        eventDate: input.birthday,
        yearKnown: input.birthdayYearKnown ?? true,
        recurring: true,
      });
    }
    await upsertRedLetterDays(userId, id, redLetterDays);
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
