import type { Event } from "expo-calendar";
import * as Calendar from "expo-calendar";
import type { Locale } from "@/i18n/types";
import { calendarRequiresDevBuild } from "@/lib/brief/calendarAccess";
import { pickCalendarsForBrief, type SavedCalendarSelection } from "@/lib/brief/calendarSelection";
import { type CalendarWeekBounds, getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { buildDevCalendarStubs } from "@/lib/brief/devCalendarStubs";
import { logger } from "@/lib/logger";

export type CalendarBriefEvent = {
  id: string;
  title: string;
  startDate: Date;
  /** End of the event; optional for legacy/mock rows. Used for meeting-time and gap analysis. */
  endDate?: Date;
  allDay: boolean;
  daysUntil: number;
  isToday: boolean;
  calendarName?: string;
};

export type CalendarAccessStatus = "granted" | "denied" | "error" | "expo_go";

function withDevStubsIfEmpty(
  events: CalendarBriefEvent[],
  weekBounds: CalendarWeekBounds,
): CalendarBriefEvent[] {
  if (__DEV__ && events.length === 0) {
    return buildDevCalendarStubs(weekBounds);
  }
  return events;
}

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
    endDate: event.endDate ? new Date(event.endDate) : undefined,
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

/** Read-only: device event calendars the user selected (or all, if none saved). */
export async function fetchCalendarBriefEvents(
  weekBounds: CalendarWeekBounds = getCalendarWeekBounds(),
  selectedCalendarIds?: SavedCalendarSelection,
): Promise<{ events: CalendarBriefEvent[]; access: CalendarAccessStatus }> {
  if (calendarRequiresDevBuild()) {
    logger.info("calendar_skipped_expo_go");
    return {
      events: withDevStubsIfEmpty([], weekBounds),
      access: "expo_go",
    };
  }

  let events: CalendarBriefEvent[] = [];
  let access: CalendarAccessStatus = "denied";

  try {
    const existing = await Calendar.getCalendarPermissionsAsync();
    const { status } =
      existing.status === "granted" ? existing : await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      return {
        events: withDevStubsIfEmpty([], weekBounds),
        access: "denied",
      };
    }

    access = "granted";
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const activeCalendars = pickCalendarsForBrief(calendars, selectedCalendarIds);
    if (activeCalendars.length === 0) {
      return { events: [], access };
    }

    const todayStart = startOfToday();
    const calendarIdToName = new Map(activeCalendars.map((c) => [c.id, c.title]));
    const raw = await Calendar.getEventsAsync(
      activeCalendars.map((c) => c.id),
      weekBounds.start,
      weekBounds.end,
    );
    events = raw
      .map((event) =>
        mapToCalendarBriefEvent(event, todayStart, calendarIdToName.get(event.calendarId)),
      )
      .filter((event) => event.startDate >= weekBounds.start && event.startDate <= weekBounds.end)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  } catch (err) {
    logger.warn("calendar_brief_fetch_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return {
      events: withDevStubsIfEmpty([], weekBounds),
      access: "error",
    };
  }

  return { events: withDevStubsIfEmpty(events, weekBounds), access };
}
