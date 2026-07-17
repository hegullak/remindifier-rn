import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { buildEveningWindDown } from "@/lib/brief/eveningWindDown";
import { buildFlowSummary, buildFlowSummaryUnavailable } from "@/lib/brief/flowSummary";
import { buildMorningBrief } from "@/lib/brief/morningBrief";

const MONDAY = new Date(2026, 5, 1);

function makeEvent(id: string, hour: number, minute = 0): CalendarBriefEvent {
  return {
    id,
    title: `Event ${id}`,
    startDate: new Date(2026, 5, 1, hour, minute, 0, 0),
    allDay: false,
    daysUntil: 0,
    isToday: true,
  };
}

describe("buildFlowSummary", () => {
  const events = [makeEvent("a", 9), makeEvent("b", 13)];

  it("morning variant matches buildMorningBrief", () => {
    expect(buildFlowSummary("morning", events, [], "no", MONDAY)).toEqual(
      buildMorningBrief(events, [], "no", MONDAY),
    );
  });

  it("evening variant matches buildEveningWindDown", () => {
    expect(buildFlowSummary("evening", events, [], "en", MONDAY)).toEqual(
      buildEveningWindDown(events, [], "en", MONDAY),
    );
  });

  it("shares the same output shape across periods", () => {
    const morning = buildFlowSummary("morning", events, [], "en", MONDAY);
    const evening = buildFlowSummary("evening", events, [], "en", MONDAY);
    expect(Object.keys(morning).sort()).toEqual(Object.keys(evening).sort());
  });
});

describe("buildFlowSummaryUnavailable", () => {
  it("marks both variants unavailable", () => {
    expect(buildFlowSummaryUnavailable("morning", "no").available).toBe(false);
    expect(buildFlowSummaryUnavailable("evening", "en").available).toBe(false);
  });
});
