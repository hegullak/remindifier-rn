/**
 * Pure diff logic for mirroring a source device calendar into the app-owned
 * "echoflow" calendar. Kept free of expo-calendar / DB calls so it can be
 * tested without mocking native modules — src/lib/brief/calendarSync.ts
 * applies the plan this module computes.
 */

export type SourceCalendarEvent = {
  /** Device event id on the source calendar. */
  id: string;
  title: string;
  notes: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
};

/** Previously copied event, as tracked in calendar_sync_events. */
export type SyncEventRecord = {
  sourceEventId: string;
  echoEventId: string;
  signature: string;
};

export type CalendarSyncPlan = {
  toCreate: SourceCalendarEvent[];
  toUpdate: { source: SourceCalendarEvent; echoEventId: string }[];
  toDelete: { sourceEventId: string; echoEventId: string }[];
};

/**
 * Canonical join of the fields that matter for change detection. Not a hash —
 * just a cheap, deterministic string to compare against the stored value.
 */
export function buildEventSignature(event: {
  title: string;
  notes: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
}): string {
  return [
    event.title.trim(),
    (event.notes ?? "").trim(),
    (event.location ?? "").trim(),
    event.startDate.toISOString(),
    event.endDate.toISOString(),
    event.allDay ? "1" : "0",
  ].join("|");
}

/**
 * Computes create/update/delete sets for a one-way mirror sync: every source
 * event should have exactly one corresponding echo copy; every previously
 * copied event whose source disappeared (deleted, or fell outside the sync
 * window) should be removed from the echo calendar.
 */
export function planCalendarSync(
  sourceEvents: SourceCalendarEvent[],
  existing: SyncEventRecord[],
): CalendarSyncPlan {
  const existingBySourceId = new Map(existing.map((row) => [row.sourceEventId, row]));
  const seenSourceIds = new Set<string>();

  const toCreate: SourceCalendarEvent[] = [];
  const toUpdate: { source: SourceCalendarEvent; echoEventId: string }[] = [];

  for (const event of sourceEvents) {
    seenSourceIds.add(event.id);
    const record = existingBySourceId.get(event.id);
    if (!record) {
      toCreate.push(event);
      continue;
    }
    if (buildEventSignature(event) !== record.signature) {
      toUpdate.push({ source: event, echoEventId: record.echoEventId });
    }
  }

  const toDelete = existing
    .filter((row) => !seenSourceIds.has(row.sourceEventId))
    .map((row) => ({ sourceEventId: row.sourceEventId, echoEventId: row.echoEventId }));

  return { toCreate, toUpdate, toDelete };
}
