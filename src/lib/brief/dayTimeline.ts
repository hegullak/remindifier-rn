import type { Locale } from "@/i18n/types";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

/**
 * Groups a single day's events into the four periods the Day tab renders as
 * a concrete timeline. Deliberately dumb (hour-of-day buckets only) — the
 * *interpreted* view of a day lives in interpretDay.ts; this is just "what's
 * on the calendar, in order".
 */

export type DayPeriodId = "morning" | "lunch" | "afternoon" | "evening";

export const DAY_PERIODS: DayPeriodId[] = ["morning", "lunch", "afternoon", "evening"];

export type DayTimelineGroup = {
  id: DayPeriodId;
  events: CalendarBriefEvent[];
};

export type DayTimeline = {
  allDay: CalendarBriefEvent[];
  periods: DayTimelineGroup[];
};

function periodForEvent(event: CalendarBriefEvent): DayPeriodId {
  const hour = event.startDate.getHours();
  if (hour < 11) return "morning";
  if (hour < 13) return "lunch";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function groupEventsByPeriod(events: CalendarBriefEvent[]): DayTimeline {
  const allDay = events.filter((e) => e.allDay);
  const timed = events
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const buckets: Record<DayPeriodId, CalendarBriefEvent[]> = {
    morning: [],
    lunch: [],
    afternoon: [],
    evening: [],
  };
  for (const event of timed) buckets[periodForEvent(event)].push(event);

  const periods = DAY_PERIODS.map((id) => ({ id, events: buckets[id] })).filter(
    (group) => group.events.length > 0,
  );

  return { allDay, periods };
}

/** "Today" / "Tomorrow" / "Yesterday" for nearby offsets, else a full weekday date. */
export function formatDayHeaderLabel(date: Date, dayOffset: number, locale: Locale): string {
  if (dayOffset === 0) return locale === "no" ? "I dag" : "Today";
  if (dayOffset === 1) return locale === "no" ? "I morgen" : "Tomorrow";
  if (dayOffset === -1) return locale === "no" ? "I går" : "Yesterday";

  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const raw = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
