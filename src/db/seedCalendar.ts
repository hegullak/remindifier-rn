import * as Calendar from "expo-calendar";
import { logger } from "@/lib/logger";

const SEED_CALENDAR_JOBB = "Jobb";
const SEED_CALENDAR_PRIVAT = "Privat";

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
  calendar: "Jobb" | "Privat";
};

type NextWeekdayEvent = SeedEventBase & {
  nextWeekday: number; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  fixedHour: number;
  fixedMinute: number;
  durationMinutes: number;
  allDay: false;
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

type ThisSaturdayEvent = SeedEventBase & {
  thisSaturday: true;
  fixedHour: number;
  fixedMinute: number;
  durationMinutes: number;
  allDay: false;
};

type SeedEvent =
  | NextWeekdayEvent
  | NextFridayEvent
  | OffsetAllDayEvent
  | OffsetTimedEvent
  | FixedTimeEvent
  | OffsetFixedTimeEvent
  | ThisSaturdayEvent;

function nextWeekday(weekday: number): Date {
  // weekday: 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  const diff = (weekday + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function thisSaturday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const diff = (6 - day + 7) % 7 || 7; // days until next Sat (never 0)
  d.setDate(d.getDate() + diff);
  return d;
}

const SEED_EVENTS: SeedEvent[] = [
  // ── Existing personal / legacy events ──────────────────────────────────────
  {
    key: "visit-ivan",
    title: "Helgebesøk Ivan 🏡",
    notes: "Spør om barna hans. Han nevnte ny jobb sist.",
    allDay: false,
    nextFriday: true,
    durationHours: 3,
    calendar: "Privat",
  },
  {
    key: "followup-eirik",
    title: "Eirik — hør hvordan intervjuet gikk",
    notes: "Han søkte på team lead-stilling. Resultat skulle komme denne uken.",
    allDay: true,
    offsetDays: 4,
    calendar: "Privat",
  },
  {
    key: "prev-week-lunch",
    title: "Lunsj med teamet 🍽",
    notes: "Forrige uke — seed for brief-navigasjon.",
    allDay: false,
    offsetDays: -4,
    durationHours: 1,
    calendar: "Jobb",
  },
  {
    key: "prev-week-review",
    title: "Kvartalsgjennomgang 📋",
    notes: "Forrige uke — seed.",
    allDay: true,
    offsetDays: -6,
    calendar: "Jobb",
  },
  {
    key: "next-week-workshop",
    title: "Produktworkshop 🧭",
    notes: "Neste uke — seed.",
    allDay: false,
    offsetDays: 10,
    durationHours: 2,
    calendar: "Jobb",
  },
  {
    key: "next-week-dinner",
    title: "Middag med naboene 🍷",
    notes: "Neste uke — seed.",
    allDay: true,
    offsetDays: 12,
    calendar: "Privat",
  },

  // ── Today — Jobb ───────────────────────────────────────────────────────────
  {
    key: "today-standup",
    title: "Standup",
    notes: "",
    allDay: false,
    fixedHour: 9,
    fixedMinute: 0,
    durationMinutes: 15,
    calendar: "Jobb",
  },
  {
    key: "today-1on1",
    title: "1:1 med leder",
    notes: "",
    allDay: false,
    fixedHour: 10,
    fixedMinute: 30,
    durationMinutes: 45,
    calendar: "Jobb",
  },
  {
    key: "today-produktgjennomgang",
    title: "Produktgjennomgang",
    notes: "Spiser inn i lunsj.",
    allDay: false,
    fixedHour: 13,
    fixedMinute: 0,
    durationMinutes: 45,
    calendar: "Jobb",
  },
  {
    key: "today-ukesavslutning",
    title: "Ukesavslutning",
    notes: "",
    allDay: false,
    fixedHour: 16,
    fixedMinute: 0,
    durationMinutes: 30,
    calendar: "Jobb",
  },
  // Today — Privat
  {
    key: "today-fotball",
    title: "Fotballtrening",
    notes: "",
    allDay: false,
    fixedHour: 19,
    fixedMinute: 30,
    durationMinutes: 90,
    calendar: "Privat",
  },

  // ── Tomorrow — Jobb ────────────────────────────────────────────────────────
  {
    key: "tomorrow-morgenmote",
    title: "Morgenmøte",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 8,
    fixedMinute: 30,
    durationMinutes: 30,
    calendar: "Jobb",
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
    calendar: "Jobb",
  },
  {
    key: "tomorrow-lunsj-kunde",
    title: "Lunsj med kunde",
    notes: "Spiser inn i lunsj.",
    allDay: false,
    offsetDays: 1,
    fixedHour: 12,
    fixedMinute: 30,
    durationMinutes: 45,
    calendar: "Jobb",
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
    calendar: "Jobb",
  },
  // Tomorrow — Privat
  {
    key: "tomorrow-fotball",
    title: "Fotballtrening",
    notes: "",
    allDay: false,
    offsetDays: 1,
    fixedHour: 19,
    fixedMinute: 30,
    durationMinutes: 90,
    calendar: "Privat",
  },

  // ── Day after tomorrow — light day (Jobb only) ─────────────────────────────
  {
    key: "day2-standup",
    title: "Standup",
    notes: "",
    allDay: false,
    offsetDays: 2,
    fixedHour: 10,
    fixedMinute: 0,
    durationMinutes: 30,
    calendar: "Jobb",
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
    calendar: "Jobb",
  },

  // ── This Saturday — Privat ─────────────────────────────────────────────────
  {
    key: "saturday-fotballkamp",
    title: "Fotballkamp – Frøya vs Laksevåg",
    notes: "",
    allDay: false,
    thisSaturday: true,
    fixedHour: 13,
    fixedMinute: 0,
    durationMinutes: 120,
    calendar: "Privat",
  },
  {
    key: "saturday-middag",
    title: "Middag med familien",
    notes: "",
    allDay: false,
    thisSaturday: true,
    fixedHour: 18,
    fixedMinute: 0,
    durationMinutes: 180,
    calendar: "Privat",
  },

  // ── Next week Monday — Jobb ────────────────────────────────────────────────
  {
    key: "next-monday-kurs",
    title: "Kurs: Produktledelse",
    notes: "Heldagskurs.",
    allDay: false,
    nextWeekday: 1,
    fixedHour: 9,
    fixedMinute: 0,
    durationMinutes: 480, // 8 hours
    calendar: "Jobb",
  },
];

async function findOrCreateNamedCalendar(
  title: string,
  color: string,
  allCalendars: Calendar.Calendar[],
): Promise<string> {
  const existing = allCalendars.find((c) => c.title === title);
  if (existing) return existing.id;

  const defaultSource =
    allCalendars.find((c) => c.source?.name === "Default")?.source ??
    allCalendars[0]?.source;

  return Calendar.createCalendarAsync({
    title,
    color,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource?.id,
    source: defaultSource ?? { isLocalAccount: true, name: "remindifier", type: "" },
    name: title,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

async function clearSeedEventsForCalendar(calendarId: string): Promise<number> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);

  const events = await Calendar.getEventsAsync([calendarId], start, end);
  await Promise.all(events.map((e) => Calendar.deleteEventAsync(e.id).catch(() => {})));
  return events.length;
}

async function createSeedEvents(
  jobbCalendarId: string,
  privatCalendarId: string,
) {
  for (const event of SEED_EVENTS) {
    let startDate: Date;

    if ("thisSaturday" in event) {
      startDate = thisSaturday();
      startDate.setHours(event.fixedHour, event.fixedMinute, 0, 0);
    } else if ("nextWeekday" in event) {
      startDate = nextWeekday(event.nextWeekday);
      startDate.setHours(event.fixedHour, event.fixedMinute, 0, 0);
    } else if ("nextFriday" in event) {
      startDate = nextWeekday(5);
    } else if ("offsetDays" in event && "fixedHour" in event) {
      startDate = daysFromToday(event.offsetDays);
      startDate.setHours(event.fixedHour, event.fixedMinute, 0, 0);
    } else if ("fixedHour" in event) {
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

    const calendarId = event.calendar === "Jobb" ? jobbCalendarId : privatCalendarId;

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

    const allCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    const jobbId = await findOrCreateNamedCalendar("Jobb", "#5A7EA8", allCalendars);
    const privatId = await findOrCreateNamedCalendar("Privat", "#4A7460", allCalendars);

    const removedJobb = await clearSeedEventsForCalendar(jobbId);
    const removedPrivat = await clearSeedEventsForCalendar(privatId);
    const removed = removedJobb + removedPrivat;

    await createSeedEvents(jobbId, privatId);
    const created = SEED_EVENTS.length as number;
    logger.info("seed_calendar_refreshed", { jobbId, privatId, removed, created });
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
    for (const name of ["Jobb", "Privat"]) {
      const cal = calendars.find((c) => c.title === name);
      if (cal) {
        await Calendar.deleteCalendarAsync(cal.id);
        logger.info("seed_calendar_deleted", { name });
      }
    }
  } catch (err) {
    logger.error("seed_calendar_delete_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
