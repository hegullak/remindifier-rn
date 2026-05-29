export type CalendarWeekBounds = { start: Date; end: Date };

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
