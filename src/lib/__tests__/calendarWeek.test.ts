import {
  formatCalendarWeekRange,
  getCalendarWeekBounds,
  isDateInCalendarWeek,
} from "@/lib/brief/calendarWeek";

describe("calendarWeek", () => {
  it("week containing Wed 2024-05-01 runs Mon 29 Apr – Sun 5 May", () => {
    const ref = new Date(2024, 4, 1);
    const { start, end } = getCalendarWeekBounds(ref);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(29);
    expect(end.getDay()).toBe(0);
    expect(end.getDate()).toBe(5);
  });

  it("shifts by weekOffset", () => {
    const ref = new Date(2024, 4, 1);
    const current = getCalendarWeekBounds(ref, 0);
    const next = getCalendarWeekBounds(ref, 1);
    expect(next.start.getTime() - current.start.getTime()).toBe(7 * 86400000);
  });

  it("formats week range for locale", () => {
    const ref = new Date(2024, 4, 1);
    const bounds = getCalendarWeekBounds(ref, 0);
    expect(formatCalendarWeekRange(bounds, "en")).toMatch(/–/);
    expect(formatCalendarWeekRange(bounds, "no")).toMatch(/–/);
  });

  it("includes Monday and Sunday of the same week", () => {
    const ref = new Date(2024, 4, 1);
    const bounds = getCalendarWeekBounds(ref);
    expect(isDateInCalendarWeek(new Date(2024, 3, 29), bounds)).toBe(true);
    expect(isDateInCalendarWeek(new Date(2024, 4, 5), bounds)).toBe(true);
    expect(isDateInCalendarWeek(new Date(2024, 4, 6), bounds)).toBe(false);
  });
});
