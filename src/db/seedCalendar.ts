import * as Calendar from "expo-calendar";
import { logger } from "@/lib/logger";

const SEED_CALENDAR_NAME = "remindifier (test)";

function daysFromToday(days: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(weekday: number): Date {
  // weekday: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  const diff = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

const SEED_EVENTS = [
  {
    key: "visit-ivan",
    title: "Helgebesøk Ivan 🏡",
    notes: "Spør om barna hans. Han nevnte ny jobb sist.",
    allDay: false,
    nextFriday: true,
    durationHours: 3,
  },
  {
    key: "followup-eirik",
    title: "Eirik — hør hvordan intervjuet gikk",
    notes: "Han søkte på team lead-stilling. Resultat skulle komme denne uken.",
    allDay: true,
    offsetDays: 4,
  },
  {
    key: "prev-week-lunch",
    title: "Lunsj med teamet 🍽",
    notes: "Forrige uke — seed for brief-navigasjon.",
    allDay: false,
    offsetDays: -4,
    durationHours: 1,
  },
  {
    key: "prev-week-review",
    title: "Kvartalsgjennomgang 📋",
    notes: "Forrige uke — seed.",
    allDay: true,
    offsetDays: -6,
  },
  {
    key: "next-week-workshop",
    title: "Produktworkshop 🧭",
    notes: "Neste uke — seed.",
    allDay: false,
    offsetDays: 10,
    durationHours: 2,
  },
  {
    key: "next-week-dinner",
    title: "Middag med naboene 🍷",
    notes: "Neste uke — seed.",
    allDay: true,
    offsetDays: 12,
  },
] as const;

async function findOrCreateSeedCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === SEED_CALENDAR_NAME);
  if (existing) return existing.id;

  const defaultSource =
    calendars.find((c) => c.source?.name === "Default")?.source ?? calendars[0]?.source;

  return Calendar.createCalendarAsync({
    title: SEED_CALENDAR_NAME,
    color: "#C4784A",
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource?.id,
    source: defaultSource ?? { isLocalAccount: true, name: "remindifier", type: "" },
    name: SEED_CALENDAR_NAME,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

async function clearSeedEvents(calendarId: string): Promise<number> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);

  const events = await Calendar.getEventsAsync([calendarId], start, end);
  await Promise.all(events.map((e) => Calendar.deleteEventAsync(e.id).catch(() => {})));
  return events.length;
}

async function createSeedEvents(calendarId: string) {
  for (const event of SEED_EVENTS) {
    let startDate: Date;
    if ("nextFriday" in event) {
      startDate = nextWeekday(5);
    } else if ("offsetDays" in event) {
      startDate = daysFromToday(event.offsetDays);
    } else {
      startDate = daysFromToday(0);
    }

    const endDate = new Date(startDate);
    if (event.allDay) {
      endDate.setDate(endDate.getDate() + 1);
    } else if ("durationHours" in event) {
      endDate.setHours(endDate.getHours() + event.durationHours);
    }

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      notes: event.notes,
      startDate,
      endDate,
      allDay: event.allDay,
      calendarId,
    });
  }
}

export type SeedCalendarResult =
  | { ok: true; removed: number; created: number }
  | { ok: false; reason: "not_dev" | "no_permission" | "error"; message?: string };

export async function seedDevCalendar(): Promise<SeedCalendarResult> {
  if (!__DEV__) return { ok: false, reason: "not_dev" };

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      logger.info("seed_calendar_skipped_no_permission");
      return { ok: false, reason: "no_permission" };
    }

    const calendarId = await findOrCreateSeedCalendar();
    const removed = await clearSeedEvents(calendarId);
    await createSeedEvents(calendarId);
    const created = SEED_EVENTS.length;
    logger.info("seed_calendar_refreshed", { calendarId, removed, created });
    return { ok: true, removed, created };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logger.error("seed_calendar_failed", { error: message });
    return { ok: false, reason: "error", message };
  }
}

export async function deleteSeedCalendar(): Promise<void> {
  if (!__DEV__) return;
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return;
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const seed = calendars.find((c) => c.title === SEED_CALENDAR_NAME);
    if (seed) {
      await Calendar.deleteCalendarAsync(seed.id);
      logger.info("seed_calendar_deleted");
    }
  } catch (err) {
    logger.error("seed_calendar_delete_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
