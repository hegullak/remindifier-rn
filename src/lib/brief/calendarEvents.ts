import type { Event } from "expo-calendar";
import * as Calendar from "expo-calendar";
import { logger } from "@/lib/logger";

export type CalendarBriefEvent = {
  id: string;
  title: string;
  startDate: Date;
  allDay: boolean;
  daysUntil: number;
  isToday: boolean;
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

export function mapToCalendarBriefEvent(event: Event, todayStart: Date): CalendarBriefEvent {
  const startDate = new Date(event.startDate);
  const daysUntil = computeDaysUntil(startDate, todayStart);
  return {
    id: event.id,
    title: event.title ?? "",
    startDate,
    allDay: event.allDay ?? false,
    daysUntil,
    isToday: daysUntil === 0,
  };
}

export async function fetchCalendarBriefEvents(): Promise<CalendarBriefEvent[]> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return [];

    const calendarName = getRemindifierCalendarName();
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const match = calendars.find((c) => c.title === calendarName);
    if (!match) return [];

    const todayStart = startOfToday();
    const rangeEnd = new Date(todayStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    const events = await Calendar.getEventsAsync([match.id], todayStart, rangeEnd);
    return events
      .map((event) => mapToCalendarBriefEvent(event, todayStart))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  } catch (err) {
    logger.warn("calendar_brief_fetch_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return [];
  }
}
