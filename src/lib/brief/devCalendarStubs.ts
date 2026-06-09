import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { computeDaysUntil, startOfToday } from "@/lib/brief/calendarEvents";
import type { CalendarWeekBounds } from "@/lib/brief/calendarWeek";

const STUB_CALENDAR = "Privat";

const TOMORROW_STUBS = [
  { id: "dev-stub-tomorrow-frokost", title: "Frokost med mor ☕", hour: 8, minute: 0 },
  { id: "dev-stub-tomorrow-tannlege", title: "Tannlegesjekk", hour: 10, minute: 30 },
  { id: "dev-stub-tomorrow-fotball", title: "Fotballtrening ⚽", hour: 19, minute: 30 },
] as const;

function isPrivatCalendar(name?: string): boolean {
  const lower = (name ?? "").toLowerCase();
  return lower.includes("privat") || lower.includes("private") || lower.includes("personal");
}

function tomorrowBounds(todayStart: Date) {
  const start = new Date(todayStart);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** True when at least one Privat event starts tomorrow. */
export function hasPrivatTomorrowEvents(events: CalendarBriefEvent[]): boolean {
  const todayStart = startOfToday();
  const { start, end } = tomorrowBounds(todayStart);
  return events.some(
    (e) => isPrivatCalendar(e.calendarName) && e.startDate >= start && e.startDate < end,
  );
}

/** Dev-only Privat events for tomorrow — keeps Brief «I morgen» populated during testing. */
export function buildDevCalendarStubs(weekBounds: CalendarWeekBounds): CalendarBriefEvent[] {
  if (!__DEV__) return [];

  const todayStart = startOfToday();

  return TOMORROW_STUBS.map(({ id, title, hour, minute }) => {
    const startDate = new Date(todayStart);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(hour, minute, 0, 0);
    const daysUntil = computeDaysUntil(startDate, todayStart);
    return {
      id,
      title,
      startDate,
      allDay: false,
      daysUntil,
      isToday: false,
      calendarName: STUB_CALENDAR,
    };
  }).filter((e) => e.startDate >= weekBounds.start && e.startDate <= weekBounds.end);
}
