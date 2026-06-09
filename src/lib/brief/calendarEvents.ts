import type { Event } from "expo-calendar";
import * as Calendar from "expo-calendar";
import type { Locale } from "@/i18n/types";
import { getCalendarWeekBounds, type CalendarWeekBounds } from "@/lib/brief/calendarWeek";
import {
  buildDevCalendarStubs,
  hasPrivatTomorrowEvents,
} from "@/lib/brief/devCalendarStubs";
import { logger } from "@/lib/logger";

export type CalendarBriefEvent = {
  id: string;
  title: string;
  startDate: Date;
  allDay: boolean;
  daysUntil: number;
  isToday: boolean;
  calendarName?: string;
};

export function getRemindifierCalendarName(): string {
  return __DEV__ ? "remindifier (test)" : "remindifier";
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function computeDaysUntil(eventStart: Date, todayStart: Date): number {
  const ms = eventStart.getTime() - todayStart.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function mapToCalendarBriefEvent(
  event: Event,
  todayStart: Date,
  calendarName?: string,
): CalendarBriefEvent {
  const startDate = new Date(event.startDate);
  const daysUntil = computeDaysUntil(startDate, todayStart);
  return {
    id: event.id,
    title: event.title ?? "",
    startDate,
    allDay: event.allDay ?? false,
    daysUntil,
    isToday: daysUntil === 0,
    calendarName,
  };
}

export function formatCalendarEventTiming(
  event: CalendarBriefEvent,
  weekOffset: number,
  locale: Locale,
  t: (path: string, params?: Record<string, string | number>) => string,
): string {
  if (weekOffset === 0) {
    if (event.daysUntil === 0) return t("brief.calendar.today");
    if (event.daysUntil === 1) return t("brief.calendar.tomorrow");
    return t("brief.calendar.inDays", { days: event.daysUntil });
  }

  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  return event.startDate.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export async function fetchCalendarBriefEvents(
  weekBounds: CalendarWeekBounds = getCalendarWeekBounds(),
): Promise<CalendarBriefEvent[]> {
  let events: CalendarBriefEvent[] = [];

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      events = [];
    } else {
      const primaryCalendarName = getRemindifierCalendarName();
      const calendarNames = [primaryCalendarName, "Jobb", "Privat"];
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const matches = calendars.filter((c) => calendarNames.includes(c.title));

      if (matches.length > 0) {
        const todayStart = startOfToday();
        const calendarIdToName = new Map(matches.map((c) => [c.id, c.title]));
        const raw = await Calendar.getEventsAsync(
          matches.map((c) => c.id),
          weekBounds.start,
          weekBounds.end,
        );
        events = raw
          .map((event) =>
            mapToCalendarBriefEvent(event, todayStart, calendarIdToName.get(event.calendarId)),
          )
          .filter(
            (event) => event.startDate >= weekBounds.start && event.startDate <= weekBounds.end,
          )
          .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      }
    }
  } catch (err) {
    logger.warn("calendar_brief_fetch_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    events = [];
  }

  if (__DEV__ && !hasPrivatTomorrowEvents(events)) {
    const stubs = buildDevCalendarStubs(weekBounds);
    events = [...events, ...stubs].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  return events;
}
