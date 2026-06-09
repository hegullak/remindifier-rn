import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import {
  buildDevCalendarStubs,
  hasPrivatTomorrowEvents,
} from "@/lib/brief/devCalendarStubs";
import { startOfToday } from "@/lib/brief/calendarEvents";

describe("devCalendarStubs", () => {
  it("builds three Privat events for tomorrow", () => {
    const weekBounds = getCalendarWeekBounds();
    const stubs = buildDevCalendarStubs(weekBounds);
    expect(stubs).toHaveLength(3);
    expect(stubs.every((e) => e.calendarName === "Privat")).toBe(true);
    expect(stubs.every((e) => e.daysUntil === 1)).toBe(true);
  });

  it("detects missing tomorrow Privat events", () => {
    const todayStart = startOfToday();
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(10, 0, 0, 0);

    expect(
      hasPrivatTomorrowEvents([
        {
          id: "jobb",
          title: "Møte",
          startDate: tomorrow,
          allDay: false,
          daysUntil: 2,
          isToday: false,
          calendarName: "Jobb",
        },
      ]),
    ).toBe(false);

    const tomorrowMorning = new Date(todayStart);
    tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
    tomorrowMorning.setHours(9, 0, 0, 0);

    expect(
      hasPrivatTomorrowEvents([
        {
          id: "priv",
          title: "Kaffe",
          startDate: tomorrowMorning,
          allDay: false,
          daysUntil: 1,
          isToday: false,
          calendarName: "Privat",
        },
      ]),
    ).toBe(true);
  });
});
