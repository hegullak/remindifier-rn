import * as Calendar from "expo-calendar";
import { logger } from "@/lib/logger";

const SEED_CALENDAR_NAME = "remindifier (test)";

function daysFromToday(days: number): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function todayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

type SeedEventBase = {
  key: string;
  title: string;
  notes: string;
  allDay: boolean;
};

type NextFridayEvent = SeedEventBase & {
  nextFriday: true;
  durationHours: number;
};

type OffsetAllDayEvent = SeedEventBase & {
  offsetDays: number;
  allDay: true;
};

type OffsetTimedEvent = SeedEventBase & {
  offsetDays: number;
  allDay: false;
  durationHours: number;
};

type FixedTimeEvent = SeedEventBase & {
  fixedHour: number;
  fixedMinute: number;
  durationMinutes: number;
  allDay: false;
};

type OffsetFixedTimeEvent = SeedEventBase & {
  offsetDays: number;
  fixedHour: number;
  fixedMinute: number;
  durationMinutes: number;
  allDay: false;
};

type SeedEvent =
  | NextFridayEvent
  | OffsetAllDayEvent
  | OffsetTimedEvent
  | FixedTimeEvent
  | OffsetFixedTimeEvent;

function nextWeekday(weekday: number): Date {
  // weekday: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  const diff = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

const SEED_EVENTS: SeedEvent[] = [
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
  // Today — work meetings
  {
    key: "today-standup",
    title: "Standup",
    notes: "",
    allDay: false,
    fixedHour: 9,
    fixedMinute: 0,
    durationMinutes: 15,
  },
  {
    key: "today-1on1",
    title: "1:1 med leder",
    notes: "",
    allDay: false,
    fixedHour: 10,
    fixedMinute: 30,
    durationMinutes: 45,
  },
  {
    key: "today-produktgjennomgang",
    title: "Produktgjennomgang",
    notes: "",
    allDay: false,
    fixedHour: 13,
    fixedMinute: 0,
    durationMinutes: 45,
  },
  {
    key: "today-ukesavslutning",
    title: "Ukesavslutning",
    notes: "",
    allDay: false,
    fixedHour: 16,
    fixedMinute: 0,
    durationMinutes: 30,
  },
  // Tomorrow — work meetings
  {
    key: "tomorrow-morgenmote",
    title: "Morgenmøte",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 8,
    fixedMinute: 30,
    durationMinutes: 30,
  },
  {
    key: "tomorrow-standup",
    title: "Standup",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 9,
    fixedMinute: 30,
    durationMinutes: 30,
  },
  {
    key: "tomorrow-designgjennomgang",
    title: "Designgjennomgang",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 11,
    fixedMinute: 0,
    durationMinutes: 60,
  },
  {
    key: "tomorrow-klientmote",
    title: "Klientmøte",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 14,
    fixedMinute: 0,
    durationMinutes: 60,
  },
  {
    key: "tomorrow-oppfolging",
    title: "Oppfølging prosjekt",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 15,
    fixedMinute: 30,
    durationMinutes: 30,
  },
  // Day after tomorrow — light day
  {
    key: "day2-standup",
    title: "Standup",
    notes: "",
    allDay: false,
    offsetDays: 2,
    fixedHour: 10,
    fixedMinute: 0,
    durationMinutes: 30,
  },
  {
    key: "day2-planlegging",
    title: "Planleggingsmøte",
    notes: "",
    allDay: false,
    offsetDays: 2,
    fixedHour: 15,
    fixedMinute: 0,
    durationMinutes: 60,
  },
];

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
    } else if ("offsetDays" in event && "fixedHour" in event) {
      // Specific offset day at a specific time
      startDate = daysFromToday(event.offsetDays);
      startDate.setHours(event.fixedHour, event.fixedMinute, 0, 0);
    } else if ("fixedHour" in event) {
      // Today at a specific time
      startDate = todayAt(event.fixedHour, event.fixedMinute);
    } else if ("offsetDays" in event) {
      startDate = daysFromToday(event.offsetDays);
    } else {
      startDate = daysFromToday(0);
    }

    const endDate = new Date(startDate);
    if (event.allDay) {
      endDate.setDate(endDate.getDate() + 1);
    } else if ("durationMinutes" in event) {
      endDate.setMinutes(endDate.getMinutes() + event.durationMinutes);
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
    const created = SEED_EVENTS.length as number;
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
