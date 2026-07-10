import * as Calendar from "expo-calendar";
import {
  deleteCalendarSyncEvent,
  deleteCalendarSyncEventsForCalendar,
  deleteCalendarSyncLink,
  listCalendarSyncEvents,
  upsertCalendarSyncEvent,
  upsertCalendarSyncLink,
} from "@/db/repos/calendarSyncRepo";
import { calendarRequiresDevBuild } from "@/lib/brief/calendarAccess";
import type { CalendarAccessStatus } from "@/lib/brief/calendarEvents";
import {
  buildEventSignature,
  planCalendarSync,
  type SourceCalendarEvent,
} from "@/lib/brief/calendarSyncPlan";
import { getOrCreateEchoCalendarId } from "@/lib/brief/echoCalendar";
import { logger } from "@/lib/logger";

/** How far back/forward a "copy this calendar" sync looks. expo-calendar has no
 * true "get all events" call — every read is windowed — so this is the practical
 * interpretation of "copy the whole calendar". */
const SYNC_WINDOW_PAST_DAYS = 90;
const SYNC_WINDOW_FUTURE_DAYS = 365;

export type CalendarSyncResult =
  | { ok: true; created: number; updated: number; deleted: number }
  | { ok: false; reason: "denied" | "expo_go" | "error"; message?: string };

async function ensureCalendarPermission(): Promise<CalendarAccessStatus> {
  if (calendarRequiresDevBuild()) return "expo_go";
  const existing = await Calendar.getCalendarPermissionsAsync();
  const { status } =
    existing.status === "granted" ? existing : await Calendar.requestCalendarPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

function toSourceCalendarEvent(event: Calendar.Event): SourceCalendarEvent {
  return {
    id: event.id,
    title: event.title ?? "",
    notes: event.notes ?? null,
    location: event.location ?? null,
    startDate: new Date(event.startDate),
    endDate: new Date(event.endDate),
    allDay: event.allDay ?? false,
  };
}

function syncWindow(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() - SYNC_WINDOW_PAST_DAYS);
  const end = new Date();
  end.setDate(end.getDate() + SYNC_WINDOW_FUTURE_DAYS);
  return { start, end };
}

/**
 * Mirrors a source device calendar into the app-owned echoflow calendar
 * (one-way: source -> echoflow; the source calendar is never modified).
 * Used both for the first "copy this calendar" action and for a manual
 * "sync again" refresh — both are the same idempotent diff-and-apply.
 */
export async function syncLinkedCalendar(
  userId: string,
  sourceCalendarId: string,
  sourceCalendarTitle: string,
): Promise<CalendarSyncResult> {
  const access = await ensureCalendarPermission();
  if (access === "expo_go") return { ok: false, reason: "expo_go" };
  if (access !== "granted") return { ok: false, reason: "denied" };

  try {
    const echoCalendarId = await getOrCreateEchoCalendarId();
    const { start, end } = syncWindow();

    const rawEvents = await Calendar.getEventsAsync([sourceCalendarId], start, end);
    const sourceEvents = rawEvents.map(toSourceCalendarEvent);

    const existing = await listCalendarSyncEvents(userId, sourceCalendarId);
    const plan = planCalendarSync(sourceEvents, existing);

    for (const event of plan.toCreate) {
      const echoEventId = await Calendar.createEventAsync(echoCalendarId, {
        title: event.title,
        notes: event.notes ?? undefined,
        location: event.location ?? undefined,
        startDate: event.startDate,
        endDate: event.endDate,
        allDay: event.allDay,
      });
      await upsertCalendarSyncEvent(
        userId,
        sourceCalendarId,
        event.id,
        echoEventId,
        buildEventSignature(event),
      );
    }

    for (const { source, echoEventId } of plan.toUpdate) {
      await Calendar.updateEventAsync(echoEventId, {
        title: source.title,
        notes: source.notes ?? undefined,
        location: source.location ?? undefined,
        startDate: source.startDate,
        endDate: source.endDate,
        allDay: source.allDay,
      });
      await upsertCalendarSyncEvent(
        userId,
        sourceCalendarId,
        source.id,
        echoEventId,
        buildEventSignature(source),
      );
    }

    for (const { sourceEventId, echoEventId } of plan.toDelete) {
      await Calendar.deleteEventAsync(echoEventId).catch(() => {});
      await deleteCalendarSyncEvent(userId, sourceEventId);
    }

    await upsertCalendarSyncLink(userId, sourceCalendarId, sourceCalendarTitle, new Date());

    logger.info("calendar_sync_completed", {
      created: plan.toCreate.length,
      updated: plan.toUpdate.length,
      deleted: plan.toDelete.length,
    });

    return {
      ok: true,
      created: plan.toCreate.length,
      updated: plan.toUpdate.length,
      deleted: plan.toDelete.length,
    };
  } catch (err) {
    logger.error("calendar_sync_failed", { error: err instanceof Error ? err.name : "unknown" });
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : undefined };
  }
}

/** Removes a calendar link: deletes its copied echo events, then the link itself. */
export async function unlinkCalendar(userId: string, sourceCalendarId: string): Promise<void> {
  const rows = await deleteCalendarSyncEventsForCalendar(userId, sourceCalendarId);
  for (const row of rows) {
    await Calendar.deleteEventAsync(row.echoEventId).catch(() => {});
  }
  await deleteCalendarSyncLink(userId, sourceCalendarId);
  logger.info("calendar_sync_unlinked", { removed: rows.length });
}
