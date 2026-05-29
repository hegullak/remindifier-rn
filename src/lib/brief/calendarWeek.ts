/** Monday 00:00 through Sunday 23:59:59 for the week containing `ref`. */
export function getCalendarWeekBounds(ref = new Date()): { start: Date; end: Date } {
  const start = new Date(ref);
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
