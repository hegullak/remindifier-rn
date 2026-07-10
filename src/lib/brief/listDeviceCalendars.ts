import type { Calendar } from "expo-calendar";
import * as CalendarApi from "expo-calendar";
import { calendarRequiresDevBuild } from "@/lib/brief/calendarAccess";
import type { CalendarAccessStatus } from "@/lib/brief/calendarEvents";
import { logger } from "@/lib/logger";

export type DeviceCalendarSummary = {
  id: string;
  title: string;
  color: string;
  sourceName?: string;
};

function mapCalendar(calendar: Calendar): DeviceCalendarSummary {
  return {
    id: calendar.id,
    title: calendar.title?.trim() || calendar.id,
    color: calendar.color,
    sourceName: calendar.source?.name,
  };
}

/** Read-only: list event calendars exposed after OS permission is granted. */
export async function listDeviceCalendars(): Promise<{
  calendars: DeviceCalendarSummary[];
  access: CalendarAccessStatus;
}> {
  if (calendarRequiresDevBuild()) {
    return { calendars: [], access: "expo_go" };
  }

  try {
    const existing = await CalendarApi.getCalendarPermissionsAsync();
    const { status } =
      existing.status === "granted"
        ? existing
        : await CalendarApi.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      return { calendars: [], access: "denied" };
    }

    const raw = await CalendarApi.getCalendarsAsync(CalendarApi.EntityTypes.EVENT);
    return {
      calendars: raw.map(mapCalendar).sort((a, b) => a.title.localeCompare(b.title)),
      access: "granted",
    };
  } catch (err) {
    logger.warn("calendar_list_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return { calendars: [], access: "error" };
  }
}
