import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { buildDevCalendarStubs } from "@/lib/brief/devCalendarStubs";

describe("devCalendarStubs", () => {
  it("builds three Privat events for tomorrow", () => {
    const weekBounds = getCalendarWeekBounds();
    const stubs = buildDevCalendarStubs(weekBounds);
    expect(stubs).toHaveLength(3);
    expect(stubs.every((e) => e.calendarName === "Privat")).toBe(true);
    expect(stubs.every((e) => e.daysUntil === 1)).toBe(true);
  });
});
