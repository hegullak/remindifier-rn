import { analyzeDay } from "@/lib/brief/analyzeDay";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { classifyDayLoad } from "@/lib/brief/dayLoad";
import { mockDayEvents } from "@/lib/brief/mockDay";

function makeEvent(
  id: string,
  hour: number,
  minute: number,
  durationMinutes: number,
  calendarName = "Jobb",
): CalendarBriefEvent {
  const start = new Date(2026, 6, 10, hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return {
    id,
    title: `Event ${id}`,
    startDate: start,
    endDate: end,
    allDay: false,
    daysUntil: 0,
    isToday: true,
    calendarName,
  };
}

function loadOf(events: CalendarBriefEvent[]) {
  return classifyDayLoad(analyzeDay(events)).load;
}

describe("classifyDayLoad", () => {
  it("treats an empty day as light", () => {
    expect(classifyDayLoad(analyzeDay([])).reasons).toContain("empty");
    expect(loadOf([])).toBe("light");
  });

  it("classifies few short events as light", () => {
    expect(loadOf([makeEvent("a", 9, 0, 30), makeEvent("b", 13, 0, 45, "Privat")])).toBe("light");
  });

  it("classifies a handful of spaced events as moderate", () => {
    expect(
      loadOf([
        makeEvent("a", 8, 30, 30),
        makeEvent("b", 10, 0, 60),
        makeEvent("c", 13, 30, 60),
      ]),
    ).toBe("moderate");
  });

  it("classifies five or more events as busy", () => {
    expect(
      loadOf([
        makeEvent("a", 9, 0, 30),
        makeEvent("b", 10, 0, 30),
        makeEvent("c", 12, 30, 30),
        makeEvent("d", 14, 0, 30),
        makeEvent("e", 15, 30, 30),
      ]),
    ).toBe("busy");
  });

  it("classifies a long total meeting time as busy", () => {
    expect(loadOf([makeEvent("a", 9, 0, 180), makeEvent("b", 13, 0, 180)])).toBe("busy");
  });

  it("classifies events outside work hours as busy", () => {
    // Two short events but one is early morning — signals a demanding shape.
    expect(loadOf([makeEvent("a", 6, 30, 30, "Privat"), makeEvent("b", 10, 0, 30)])).toBe("busy");
  });

  it("maps mock scenarios to their expected load", () => {
    expect(loadOf(mockDayEvents("light"))).toBe("light");
    expect(loadOf(mockDayEvents("moderate"))).toBe("moderate");
    expect(loadOf(mockDayEvents("busy"))).toBe("busy");
  });
});
