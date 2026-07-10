import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

export function formatTime(date: Date, locale: "en" | "no"): string {
  return date.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

export function isAllDay(event: CalendarBriefEvent): boolean {
  return event.allDay;
}

export function isWorkEvent(e: CalendarBriefEvent): boolean {
  const name = (e.calendarName ?? "").toLowerCase();
  return (
    name.includes("jobb") ||
    name.includes("work") ||
    name.includes("job") ||
    name.includes("arbeid") ||
    name.includes("kontor") ||
    name.includes("office")
  );
}

export function buildWeekendSummary(
  saturday: CalendarBriefEvent[],
  sunday: CalendarBriefEvent[],
  locale: "en" | "no",
): string {
  const parts: string[] = [];
  for (const e of saturday.slice(0, 1)) {
    if (locale === "no") {
      parts.push(`${e.title} lørdag kl. ${formatTime(e.startDate, "no")}.`);
    } else {
      parts.push(`${e.title} on Saturday at ${formatTime(e.startDate, "en")}.`);
    }
  }
  for (const e of sunday.slice(0, 1)) {
    if (locale === "no") {
      parts.push(`${e.title} søndag kl. ${formatTime(e.startDate, "no")}.`);
    } else {
      parts.push(`${e.title} on Sunday at ${formatTime(e.startDate, "en")}.`);
    }
  }
  return parts.join(" ");
}
