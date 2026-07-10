import { and, eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { calendarSyncEvents, calendarSyncLinks } from "@/db/schema";
import type { SyncEventRecord } from "@/lib/brief/calendarSyncPlan";

export type CalendarSyncLinkRecord = {
  sourceCalendarId: string;
  sourceCalendarTitle: string;
  lastSyncedAt: Date | null;
};

export async function listCalendarSyncLinks(userId: string): Promise<CalendarSyncLinkRecord[]> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select({
      sourceCalendarId: calendarSyncLinks.sourceCalendarId,
      sourceCalendarTitle: calendarSyncLinks.sourceCalendarTitle,
      lastSyncedAt: calendarSyncLinks.lastSyncedAt,
    })
    .from(calendarSyncLinks)
    .where(eq(calendarSyncLinks.userId, userId));
  return rows;
}

export async function upsertCalendarSyncLink(
  userId: string,
  sourceCalendarId: string,
  sourceCalendarTitle: string,
  syncedAt: Date,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  const id = `${userId}:${sourceCalendarId}`;
  await db
    .insert(calendarSyncLinks)
    .values({ id, userId, sourceCalendarId, sourceCalendarTitle, lastSyncedAt: syncedAt })
    .onConflictDoUpdate({
      target: calendarSyncLinks.id,
      set: { sourceCalendarTitle, lastSyncedAt: syncedAt },
    });
}

export async function deleteCalendarSyncLink(userId: string, sourceCalendarId: string) {
  const db = await getDrizzleDbForUser(userId);
  await db
    .delete(calendarSyncLinks)
    .where(
      and(
        eq(calendarSyncLinks.userId, userId),
        eq(calendarSyncLinks.sourceCalendarId, sourceCalendarId),
      ),
    );
}

export async function listCalendarSyncEvents(
  userId: string,
  sourceCalendarId: string,
): Promise<SyncEventRecord[]> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select({
      sourceEventId: calendarSyncEvents.sourceEventId,
      echoEventId: calendarSyncEvents.echoEventId,
      signature: calendarSyncEvents.signature,
    })
    .from(calendarSyncEvents)
    .where(
      and(
        eq(calendarSyncEvents.userId, userId),
        eq(calendarSyncEvents.sourceCalendarId, sourceCalendarId),
      ),
    );
  return rows;
}

export async function upsertCalendarSyncEvent(
  userId: string,
  sourceCalendarId: string,
  sourceEventId: string,
  echoEventId: string,
  signature: string,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  const id = `${userId}:${sourceEventId}`;
  const now = new Date();
  await db
    .insert(calendarSyncEvents)
    .values({
      id,
      userId,
      sourceCalendarId,
      sourceEventId,
      echoEventId,
      signature,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: calendarSyncEvents.id,
      set: { echoEventId, signature, updatedAt: now },
    });
}

export async function deleteCalendarSyncEvent(userId: string, sourceEventId: string) {
  const db = await getDrizzleDbForUser(userId);
  await db
    .delete(calendarSyncEvents)
    .where(
      and(
        eq(calendarSyncEvents.userId, userId),
        eq(calendarSyncEvents.sourceEventId, sourceEventId),
      ),
    );
}

/** Deletes all sync rows for a calendar link and returns what was deleted, so callers can also remove the echo device events. */
export async function deleteCalendarSyncEventsForCalendar(
  userId: string,
  sourceCalendarId: string,
): Promise<SyncEventRecord[]> {
  const rows = await listCalendarSyncEvents(userId, sourceCalendarId);
  const db = await getDrizzleDbForUser(userId);
  await db
    .delete(calendarSyncEvents)
    .where(
      and(
        eq(calendarSyncEvents.userId, userId),
        eq(calendarSyncEvents.sourceCalendarId, sourceCalendarId),
      ),
    );
  return rows;
}
