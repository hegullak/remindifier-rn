import * as Calendar from "expo-calendar";
import { logger } from "@/lib/logger";

const SEED_CALENDAR_NAME = "remindifier (test)";
const SEED_EVENT_ID_PREFIX = "remindifier-seed-";

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
    key: "birthday-ida",
    title: "Ida Nilsen fyller år 🎂",
    notes: "Nær venn. Løper. Vurderer å flytte til København.",
    allDay: true,
    offsetDays: 2,
  },
  {
    key: "visit-ivan",
    title: "Helgebesøk Ivan 🏡",
    notes: "Spør om barna hans. Han nevnte ny jobb sist.",
    allDay: false,
    nextFriday: true,
    durationHours: 3,
  },
  {
    key: "anniversary-jonas",
    title: "Jonas og Kari — 20 år gift 🥂",
    notes: "Jubileum. Kanskje en melding?",
    allDay: true,
    offsetDays: 6,
  },
  {
    key: "followup-eirik",
    title: "Eirik — hør hvordan intervjuet gikk",
    notes: "Han søkte på team lead-stilling. Resultat skulle komme denne uken.",
    allDay: true,
    offsetDays: 4,
  },
  {
    key: "birthday-trond",
    title: "Onkel Trond fyller år 🎂",
    notes: "70 år. Liker sourdough. Skulderen gjør vondt — ikke press på det.",
    allDay: true,
    offsetDays: 9,
  },
] as const;

async function findOrCreateSeedCalendar(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === SEED_CALENDAR_NAME);
  if (existing) return existing.id;

  const defaultSource =
    calendars.find((c) => c.source?.name === "Default")?.source ??
    calendars[0]?.source;

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

async function clearSeedEvents(calendarId: string) {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date();
  end.setFullYear(end.getFullYear() + 2);

  const events = await Calendar.getEventsAsync([calendarId], start, end);
  const seedEvents = events.filter((e) => e.title?.includes("remindifier-seed-") || SEED_EVENTS.some((s) => e.title === s.title));
  await Promise.all(seedEvents.map((e) => Calendar.deleteEventAsync(e.id).catch(() => {})));
}

async function createSeedEvents(calendarId: string) {
  for (const event of SEED_EVENTS) {
    let startDate: Date;
    if ("nextFriday" in event) {
      startDate = nextWeekday(5);
    } else {
      startDate = daysFromToday(event.offsetDays);
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

export async function seedDevCalendar(): Promise<void> {
  if (!__DEV__) return;

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      logger.info("seed_calendar_skipped_no_permission");
      return;
    }

    const calendarId = await findOrCreateSeedCalendar();
    await clearSeedEvents(calendarId);
    await createSeedEvents(calendarId);
    logger.info("seed_calendar_refreshed", { calendarId });
  } catch (err) {
    logger.error("seed_calendar_failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
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
