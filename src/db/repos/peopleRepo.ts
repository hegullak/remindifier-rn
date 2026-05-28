import { and, asc, desc, eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { personEntries, personRedLetterDays, persons, relationships } from "@/db/schema";

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
    .where(
      and(eq(personRedLetterDays.userId, userId), eq(personRedLetterDays.personId, personId)),
    )
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

export async function createPerson(userId: string, input: UpsertPersonInput) {
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
  return id;
}

export async function updatePerson(userId: string, personId: string, input: UpsertPersonInput) {
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
}

export async function deletePerson(userId: string, personId: string) {
  const db = await getDrizzleDbForUser(userId);
  await db.delete(persons).where(and(eq(persons.userId, userId), eq(persons.id, personId)));
}

export async function createPersonEntry(userId: string, input: CreatePersonEntryInput) {
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

  return id;
}
