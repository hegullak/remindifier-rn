import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import type { FlowSummary } from "@/lib/brief/flowSummary";
import {
  hasRoomForIntention,
  type OpenIntention,
  pickOpenIntention,
  weaveIntentionIntoFlowSummary,
} from "@/lib/brief/intentionWeave";

// 2026-06-01 is a Monday; ISO week runs Mon 01 – Sun 07.
const TODAY_ISO = "2026-06-01";

function makeEvent(id: string, hour: number, minute = 0): CalendarBriefEvent {
  const startDate = new Date(2026, 5, 1, hour, minute, 0, 0);
  return {
    id,
    title: `Event ${id}`,
    startDate,
    endDate: new Date(startDate.getTime() + 60 * 60000),
    allDay: false,
    daysUntil: 0,
    isToday: true,
  };
}

function makeSummary(overrides: Partial<FlowSummary> = {}): FlowSummary {
  return {
    available: true,
    isEmpty: false,
    pillText: "2 møter · lunsj fri",
    headline: "Dagen ser overkommelig ut.",
    body: "Første hendelse er kl. 09:00.\nLunsj kl. 11–12 er fri.",
    ...overrides,
  };
}

const BERIT: OpenIntention = { id: "i1", text: "ringe tante Berit", dueBy: "2026-06-07" };

describe("hasRoomForIntention", () => {
  it("empty day always has room", () => {
    expect(hasRoomForIntention([])).toBe(true);
  });

  it("a lightly scheduled day has room", () => {
    expect(hasRoomForIntention([makeEvent("a", 9), makeEvent("b", 14)])).toBe(true);
  });

  it("a packed day (5+ timed events) has no room", () => {
    const events = [9, 10.5, 12, 14, 16].map((h, i) =>
      makeEvent(`e${i}`, Math.floor(h), (h % 1) * 60),
    );
    expect(hasRoomForIntention(events)).toBe(false);
  });

  it("back-to-back days have no room even with few events", () => {
    // 09:00–10:00 then 10:00–11:00 — zero gap.
    expect(hasRoomForIntention([makeEvent("a", 9), makeEvent("b", 10)])).toBe(false);
  });
});

describe("pickOpenIntention", () => {
  it("returns null when there are no intentions", () => {
    expect(pickOpenIntention([], TODAY_ISO)).toBeNull();
  });

  it("picks the first intention whose horizon has not passed", () => {
    const passed: OpenIntention = { id: "i0", text: "gammel ting", dueBy: "2026-05-30" };
    expect(pickOpenIntention([passed, BERIT], TODAY_ISO)).toEqual(BERIT);
  });

  it("an intention due today is still open", () => {
    const dueToday: OpenIntention = { id: "i2", text: "levere skjema", dueBy: TODAY_ISO };
    expect(pickOpenIntention([dueToday], TODAY_ISO)).toEqual(dueToday);
  });
});

describe("weaveIntentionIntoFlowSummary", () => {
  it("appends the flagship sentence with the this-week clause (no, morning)", () => {
    const woven = weaveIntentionIntoFlowSummary(makeSummary(), BERIT, "no", "morning", TODAY_ISO);
    expect(woven.body).toContain(
      "Du kan vurdere om du skal ringe tante Berit — du antydet at du skulle gjøre det denne uken.",
    );
    expect(woven.body.startsWith("Første hendelse er kl. 09:00.")).toBe(true);
  });

  it("uses the evening phrasing for the evening period", () => {
    const woven = weaveIntentionIntoFlowSummary(makeSummary(), BERIT, "no", "evening", TODAY_ISO);
    expect(woven.body).toContain("I morgen kan det bli tid til å ringe tante Berit");
  });

  it("weaves in English", () => {
    const woven = weaveIntentionIntoFlowSummary(makeSummary(), BERIT, "en", "morning", TODAY_ISO);
    expect(woven.body).toContain(
      "You might consider whether to ringe tante Berit — you hinted you'd get to it this week.",
    );
  });

  it("drops the this-week clause when the horizon is beyond this ISO week", () => {
    const nextWeek: OpenIntention = { ...BERIT, dueBy: "2026-06-10" };
    const woven = weaveIntentionIntoFlowSummary(
      makeSummary(),
      nextWeek,
      "no",
      "morning",
      TODAY_ISO,
    );
    expect(woven.body).toContain("Du kan vurdere om du skal ringe tante Berit.");
    expect(woven.body).not.toContain("denne uken");
  });

  it("revives an empty-day summary so the block still shows", () => {
    const empty = makeSummary({ isEmpty: true, body: "Ingenting på kalenderen." });
    const woven = weaveIntentionIntoFlowSummary(empty, BERIT, "no", "morning", TODAY_ISO);
    expect(woven.isEmpty).toBe(false);
    expect(woven.body.split("\n")).toHaveLength(2);
  });

  it("leaves an unavailable summary untouched", () => {
    const unavailable = makeSummary({ available: false });
    expect(weaveIntentionIntoFlowSummary(unavailable, BERIT, "no", "morning", TODAY_ISO)).toEqual(
      unavailable,
    );
  });
});
