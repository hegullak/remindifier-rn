import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { formatDayHeaderLabel, groupEventsByPeriod } from "@/lib/brief/dayTimeline";

function event(id: string, hour: number, minute = 0, allDay = false): CalendarBriefEvent {
  const start = new Date(2026, 6, 15, hour, minute, 0, 0);
  return {
    id,
    title: id,
    startDate: start,
    allDay,
    daysUntil: 0,
    isToday: true,
  };
}

describe("groupEventsByPeriod", () => {
  it("buckets timed events into morning/lunch/afternoon/evening", () => {
    const events = [event("e1", 8), event("e2", 11, 30), event("e3", 14), event("e4", 19)];
    const { periods } = groupEventsByPeriod(events);
    expect(periods.map((p) => p.id)).toEqual(["morning", "lunch", "afternoon", "evening"]);
    expect(periods[0].events[0].id).toBe("e1");
    expect(periods[1].events[0].id).toBe("e2");
  });

  it("separates all-day events from timed periods", () => {
    const events = [event("allday", 0, 0, true), event("timed", 9)];
    const { allDay, periods } = groupEventsByPeriod(events);
    expect(allDay.map((e) => e.id)).toEqual(["allday"]);
    expect(periods.flatMap((p) => p.events).map((e) => e.id)).toEqual(["timed"]);
  });

  it("omits empty periods", () => {
    const { periods } = groupEventsByPeriod([event("only-morning", 9)]);
    expect(periods).toHaveLength(1);
    expect(periods[0].id).toBe("morning");
  });

  it("sorts events within a period by start time", () => {
    const events = [event("late", 15), event("early", 13, 30)];
    const { periods } = groupEventsByPeriod(events);
    expect(periods[0].events.map((e) => e.id)).toEqual(["early", "late"]);
  });

  it("returns no periods for an empty day", () => {
    expect(groupEventsByPeriod([]).periods).toEqual([]);
  });
});

describe("formatDayHeaderLabel", () => {
  const ref = new Date(2026, 6, 16);

  it("labels today/tomorrow/yesterday specially", () => {
    expect(formatDayHeaderLabel(ref, 0, "no")).toBe("I dag");
    expect(formatDayHeaderLabel(ref, 1, "no")).toBe("I morgen");
    expect(formatDayHeaderLabel(ref, -1, "no")).toBe("I går");
    expect(formatDayHeaderLabel(ref, 0, "en")).toBe("Today");
    expect(formatDayHeaderLabel(ref, 1, "en")).toBe("Tomorrow");
    expect(formatDayHeaderLabel(ref, -1, "en")).toBe("Yesterday");
  });

  it("falls back to a weekday date further out", () => {
    const farOut = new Date(2026, 6, 20);
    expect(formatDayHeaderLabel(farOut, 4, "no")).toMatch(/mandag/i);
    expect(formatDayHeaderLabel(farOut, 4, "en")).toMatch(/monday/i);
  });
});
