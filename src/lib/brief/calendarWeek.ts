export type CalendarWeekBounds = { start: Date; end: Date };

/** ISO week number (Monday-based). */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatBriefHeaderDate(locale: "en" | "no", now = new Date()) {
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const rawDate = now.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const dateLine = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const week = getISOWeek(now);
  const timeLine = now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  return { dateLine, week, timeLine };
}

/** Monday 00:00 through Sunday 23:59:59 for the week containing `ref`, shifted by `weekOffset`. */
export function getCalendarWeekBounds(ref = new Date(), weekOffset = 0): CalendarWeekBounds {
  const anchor = new Date(ref);
  if (weekOffset !== 0) {
    anchor.setDate(anchor.getDate() + weekOffset * 7);
  }

  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function isDateInCalendarWeek(date: Date, bounds = getCalendarWeekBounds()): boolean {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d >= bounds.start && d <= bounds.end;
}

export function formatCalendarWeekRange(
  bounds: CalendarWeekBounds,
  locale: "en" | "no",
): string {
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = bounds.start.toLocaleDateString(dateLocale, opts);
  const end = bounds.end.toLocaleDateString(dateLocale, opts);
  return `${start} – ${end}`;
}
