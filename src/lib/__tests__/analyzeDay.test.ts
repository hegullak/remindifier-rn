import { analyzeDay } from "@/lib/brief/analyzeDay";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

function makeEvent(
  id: string,
  hour: number,
  minute: number,
  durationMinutes: number,
  calendarName = "Jobb",
  allDay = false,
): CalendarBriefEvent {
  const start = new Date(2026, 6, 10, hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return {
    id,
    title: `Event ${id}`,
    startDate: start,
    endDate: end,
    allDay,
    daysUntil: 0,
    isToday: true,
    calendarName,
  };
}

describe("analyzeDay", () => {
  it("returns empty signals for no events", () => {
    const s = analyzeDay([]);
    expect(s.timedEventCount).toBe(0);
    expect(s.totalMeetingMinutes).toBe(0);
    expect(s.firstEvent).toBeNull();
    expect(s.lastEvent).toBeNull();
  });

  it("ignores all-day events for timed analysis", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 60, "Jobb", true)]);
    expect(s.timedEventCount).toBe(0);
  });

  it("sums total meeting minutes across events", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 60), makeEvent("b", 13, 0, 30)]);
    expect(s.totalMeetingMinutes).toBe(90);
  });

  it("defaults duration to 60 minutes when endDate is missing", () => {
    const noEnd: CalendarBriefEvent = {
      id: "x",
      title: "No end",
      startDate: new Date(2026, 6, 10, 10, 0, 0, 0),
      allDay: false,
      daysUntil: 0,
      isToday: true,
    };
    expect(analyzeDay([noEnd]).totalMeetingMinutes).toBe(60);
  });

  it("splits load into morning / afternoon / evening", () => {
    const s = analyzeDay([
      makeEvent("a", 9, 0, 30),
      makeEvent("b", 13, 0, 30),
      makeEvent("c", 18, 0, 30, "Privat"),
    ]);
    expect(s.morningLoad).toBe(1);
    expect(s.afternoonLoad).toBe(1);
    expect(s.eveningLoad).toBe(1);
  });

  it("detects back-to-back events", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 60), makeEvent("b", 10, 0, 60)]);
    expect(s.hasBackToBack).toBe(true);
  });

  it("does not flag back-to-back when there is a comfortable gap", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 60), makeEvent("b", 13, 0, 60)]);
    expect(s.hasBackToBack).toBe(false);
  });

  it("finds a breathing-room gap between spaced events", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 60), makeEvent("b", 13, 0, 60)]);
    const midday = s.gaps.find((g) => g.startMinutes === 10 * 60);
    expect(midday).toBeDefined();
    expect(midday?.durationMinutes).toBe(180);
  });

  it("marks lunch as busy when an event starts in the 11–12 window", () => {
    expect(analyzeDay([makeEvent("a", 11, 30, 30)]).lunchFree).toBe(false);
    expect(analyzeDay([makeEvent("a", 9, 0, 30)]).lunchFree).toBe(true);
  });

  it("flags outside-work-hours for early or late events", () => {
    expect(analyzeDay([makeEvent("a", 7, 0, 30)]).outsideWorkHours).toBe(true);
    expect(analyzeDay([makeEvent("a", 18, 0, 30, "Privat")]).outsideWorkHours).toBe(true);
    expect(analyzeDay([makeEvent("a", 10, 0, 30)]).outsideWorkHours).toBe(false);
  });

  it("collects non-work events as special", () => {
    const s = analyzeDay([makeEvent("a", 9, 0, 30, "Jobb"), makeEvent("b", 13, 0, 30, "Privat")]);
    expect(s.specialEvents.map((e) => e.id)).toEqual(["b"]);
  });
});
