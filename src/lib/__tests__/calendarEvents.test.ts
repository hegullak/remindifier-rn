import {
  computeDaysUntil,
  formatCalendarEventTiming,
  getRemindifierCalendarName,
  mapToCalendarBriefEvent,
  startOfToday,
} from "@/lib/brief/calendarEvents";

describe("calendarEvents", () => {
  it("uses test calendar name in dev", () => {
    expect(getRemindifierCalendarName()).toBe("remindifier (test)");
  });

  it("computes days until from start of today", () => {
    const today = new Date(2026, 4, 29, 0, 0, 0, 0);
    const tomorrow = new Date(2026, 4, 30, 9, 0, 0, 0);
    expect(computeDaysUntil(tomorrow, today)).toBe(1);
    expect(computeDaysUntil(today, today)).toBe(0);
  });

  it("clamps days until to zero for past dates", () => {
    const today = new Date(2026, 4, 29, 0, 0, 0, 0);
    const yesterday = new Date(2026, 4, 28, 12, 0, 0, 0);
    expect(computeDaysUntil(yesterday, today)).toBe(0);
  });

  it("maps expo calendar events to brief events", () => {
    const today = new Date(2026, 4, 29, 0, 0, 0, 0);
    const start = new Date(2026, 4, 31, 16, 0, 0, 0);
    const mapped = mapToCalendarBriefEvent(
      {
        id: "evt-1",
        title: "Helgebesøk Ivan 🏡",
        startDate: start.toISOString(),
        endDate: start.toISOString(),
        allDay: false,
      } as never,
      today,
    );
    expect(mapped.id).toBe("evt-1");
    expect(mapped.title).toBe("Helgebesøk Ivan 🏡");
    expect(mapped.daysUntil).toBe(2);
    expect(mapped.isToday).toBe(false);
    expect(mapped.allDay).toBe(false);
  });

  it("defaults missing title and allDay when mapping", () => {
    const today = new Date(2026, 4, 29, 0, 0, 0, 0);
    const start = new Date(2026, 4, 29, 10, 0, 0, 0);
    const mapped = mapToCalendarBriefEvent(
      {
        id: "evt-2",
        startDate: start.toISOString(),
        endDate: start.toISOString(),
      } as never,
      today,
    );
    expect(mapped.title).toBe("");
    expect(mapped.allDay).toBe(false);
    expect(mapped.isToday).toBe(true);
  });

  it("formats today, tomorrow, and in-days for current week", () => {
    const today = startOfToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const later = new Date(today);
    later.setDate(later.getDate() + 3);

    const t = (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${params.days}` : key;

    const todayEvent = mapToCalendarBriefEvent(
      { id: "1", title: "A", startDate: today.toISOString(), endDate: today.toISOString() } as never,
      today,
    );
    const tomorrowEvent = mapToCalendarBriefEvent(
      {
        id: "2",
        title: "B",
        startDate: tomorrow.toISOString(),
        endDate: tomorrow.toISOString(),
      } as never,
      today,
    );
    const laterEvent = mapToCalendarBriefEvent(
      { id: "3", title: "C", startDate: later.toISOString(), endDate: later.toISOString() } as never,
      today,
    );

    expect(formatCalendarEventTiming(todayEvent, 0, "en", t)).toBe("brief.calendar.today");
    expect(formatCalendarEventTiming(tomorrowEvent, 0, "en", t)).toBe("brief.calendar.tomorrow");
    expect(formatCalendarEventTiming(laterEvent, 0, "en", t)).toBe("brief.calendar.inDays:3");
  });

  it("uses weekday label when viewing another week", () => {
    const today = new Date(2026, 4, 29, 0, 0, 0, 0);
    const start = new Date(2026, 5, 3, 10, 0, 0, 0);
    const mapped = mapToCalendarBriefEvent(
      {
        id: "evt-3",
        title: "Workshop",
        startDate: start.toISOString(),
        endDate: start.toISOString(),
        allDay: false,
      } as never,
      today,
    );
    const label = formatCalendarEventTiming(mapped, 1, "en", (key) => key);
    expect(label).not.toBe("brief.calendar.today");
    expect(label.length).toBeGreaterThan(3);
  });

  it("startOfToday zeroes time fields", () => {
    const today = startOfToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
  });
});
