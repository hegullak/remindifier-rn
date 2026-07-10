import { and, desc, eq, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { gatheringParticipants, gatherings, persons } from "@/db/schema";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import {
  type GatheringContent,
  parseGatheringContent,
  serializeGatheringContent,
} from "@/lib/gatherings/talkingPoints";
import { logger } from "@/lib/logger";
import { logRepoError } from "@/lib/repoLog";

export type GatheringListItem = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: Date | null;
  status: string;
  participants: string[];
};

export async function getGathering(
  userId: string,
  gatheringId: string,
): Promise<{
  gathering: typeof gatherings.$inferSelect;
  participants: { personId: string; displayName: string }[];
} | null> {
  const db = await getDrizzleDbForUser(userId);
  const [gathering] = await db
    .select()
    .from(gatherings)
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.userId, userId)))
    .limit(1);

  if (!gathering) return null;

  const participants = await db
    .select({
      personId: gatheringParticipants.personId,
      displayName: persons.displayName,
    })
    .from(gatheringParticipants)
    .innerJoin(persons, eq(gatheringParticipants.personId, persons.id))
    .where(
      and(
        eq(gatheringParticipants.gatheringId, gatheringId),
        eq(gatheringParticipants.userId, userId),
      ),
    );

  return { gathering, participants };
}

export async function listGatheringsForUser(userId: string): Promise<GatheringListItem[]> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select()
    .from(gatherings)
    .where(eq(gatherings.userId, userId))
    .orderBy(desc(gatherings.updatedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const participantRows = await db
    .select({
      gatheringId: gatheringParticipants.gatheringId,
      displayName: persons.displayName,
    })
    .from(gatheringParticipants)
    .innerJoin(persons, eq(gatheringParticipants.personId, persons.id))
    .where(
      and(
        eq(gatheringParticipants.userId, userId),
        inArray(gatheringParticipants.gatheringId, ids),
      ),
    );

  const namesByGathering = new Map<string, string[]>();
  for (const row of participantRows) {
    const list = namesByGathering.get(row.gatheringId) ?? [];
    list.push(row.displayName);
    namesByGathering.set(row.gatheringId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduledAt,
    status: row.status,
    participants: namesByGathering.get(row.id) ?? [],
  }));
}

export async function createGathering(
  userId: string,
  input: {
    title: string;
    personIds: string[];
    content?: GatheringContent;
    scheduledAt?: Date | null;
  },
): Promise<string> {
  const db = await getDrizzleDbForUser(userId);
  const gatheringId = `g-${Crypto.randomUUID()}`;
  const now = new Date();

  await db.insert(gatherings).values({
    id: gatheringId,
    userId,
    title: input.title.trim(),
    description: input.content ? serializeGatheringContent(input.content) : null,
    scheduledAt: input.scheduledAt ?? null,
    type: "other",
    status: "planned",
    createdAt: now,
    updatedAt: now,
  });

  for (const personId of input.personIds) {
    await db.insert(gatheringParticipants).values({
      id: `gp-${Crypto.randomUUID()}`,
      gatheringId,
      personId,
      userId,
    });
  }

  notifyBriefReload();
  logger.info("gathering_created", { userId, gatheringId });
  return gatheringId;
}

export async function updateGatheringContent(
  userId: string,
  gatheringId: string,
  content: GatheringContent,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .update(gatherings)
    .set({ description: serializeGatheringContent(content), updatedAt: new Date() })
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.userId, userId)));
  notifyBriefReload();
}

export async function updateGatheringTitle(
  userId: string,
  gatheringId: string,
  title: string,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .update(gatherings)
    .set({ title: title.trim(), updatedAt: new Date() })
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.userId, userId)));
  notifyBriefReload();
}

export async function deleteGathering(userId: string, gatheringId: string): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .delete(gatherings)
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.userId, userId)));
  notifyBriefReload();
}

export async function addGatheringParticipant(
  userId: string,
  gatheringId: string,
  personId: string,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db.insert(gatheringParticipants).values({
    id: `gp-${Crypto.randomUUID()}`,
    gatheringId,
    personId,
    userId,
  });
  await db
    .update(gatherings)
    .set({ updatedAt: new Date() })
    .where(and(eq(gatherings.id, gatheringId), eq(gatherings.userId, userId)));
  notifyBriefReload();
}

export async function createGatheringWithTalkingPoints(
  userId: string,
  personId: string,
  personName: string,
  talkingPoints: string[],
): Promise<string> {
  try {
    const content: GatheringContent = {
      talkingPoints: talkingPoints.map((text) => ({
        id: Crypto.randomUUID(),
        kind: "topic",
        text,
        done: false,
      })),
    };

    const gatheringId = await createGathering(userId, {
      title: personName,
      personIds: [personId],
      content,
    });

    logger.info("gathering_created_from_intake", { userId, gatheringId, personId });
    return gatheringId;
  } catch (err) {
    logRepoError("gathering_create_failed", err, { userId, personId });
    throw err;
  }
}

export function getGatheringTalkingPointCount(description: string | null): number {
  return parseGatheringContent(description).talkingPoints.length;
}
