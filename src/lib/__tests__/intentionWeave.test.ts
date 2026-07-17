import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import {
  buildIntentionLine,
  findIntentionWindow,
  hasRoomForIntention,
  intentionTalkingPoints,
  type OpenIntention,
  pickOpenIntention,
} from "@/lib/brief/intentionWeave";

// 2026-06-01 is a Monday; ISO week runs Mon 01 (06-01) – Sun 07 (06-07).
const TODAY_ISO = "2026-06-01";
const WEEK_END_ISO = "2026-06-07";

function makeEvent(id: string, day: number, hour: number, minute = 0): CalendarBriefEvent {
  const startDate = new Date(2026, 5, day, hour, minute, 0, 0);
  return {
    id,
    title: `Event ${id}`,
    startDate,
    endDate: new Date(startDate.getTime() + 60 * 60000),
    allDay: false,
    daysUntil: day - 1,
    isToday: day === 1,
  };
}

const BERIT: OpenIntention = { id: "i1", text: "ringe tante Berit", dueBy: WEEK_END_ISO };

describe("hasRoomForIntention", () => {
  it("empty day always has room", () => {
    expect(hasRoomForIntention([])).toBe(true);
  });

  it("a lightly scheduled day has room", () => {
    expect(hasRoomForIntention([makeEvent("a", 1, 9), makeEvent("b", 1, 14)])).toBe(true);
  });

  it("a packed day (5+ timed events) has no room", () => {
    const events = [9, 10.5, 12, 14, 16].map((h, i) =>
      makeEvent(`e${i}`, 1, Math.floor(h), (h % 1) * 60),
    );
    expect(hasRoomForIntention(events)).toBe(false);
  });

  it("back-to-back days have no room even with few events", () => {
    // 09:00–10:00 then 10:00–11:00 — zero gap.
    expect(hasRoomForIntention([makeEvent("a", 1, 9), makeEvent("b", 1, 10)])).toBe(false);
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

describe("intentionTalkingPoints", () => {
  it("splits notes into trimmed lines, dropping blanks", () => {
    const intention: OpenIntention = {
      ...BERIT,
      notes: "Hvordan gikk det hos legen?\n\n  Når skal du bli bestemor?  \n",
    };
    expect(intentionTalkingPoints(intention)).toEqual([
      "Hvordan gikk det hos legen?",
      "Når skal du bli bestemor?",
    ]);
  });

  it("returns empty for missing notes", () => {
    expect(intentionTalkingPoints(BERIT)).toEqual([]);
    expect(intentionTalkingPoints({ ...BERIT, notes: null })).toEqual([]);
  });
});

describe("findIntentionWindow", () => {
  it("returns today when today has room", () => {
    const weekEvents = [makeEvent("a", 1, 9)];
    const window = findIntentionWindow(weekEvents, TODAY_ISO, WEEK_END_ISO, WEEK_END_ISO);
    expect(window).toEqual({ dateIso: TODAY_ISO, isToday: true });
  });

  it("skips a packed today and finds the next calm day", () => {
    const weekEvents = [
      makeEvent("a", 1, 9),
      makeEvent("b", 1, 10), // Monday: back-to-back, no room
      makeEvent("c", 2, 9), // Tuesday: light, has room
    ];
    const window = findIntentionWindow(weekEvents, TODAY_ISO, WEEK_END_ISO, WEEK_END_ISO);
    expect(window).toEqual({ dateIso: "2026-06-02", isToday: false });
  });

  it("never skips past the nearest calm day looking for a calmer one further out", () => {
    const weekEvents = [
      makeEvent("a", 1, 9),
      makeEvent("b", 1, 10), // Monday packed
      makeEvent("c", 2, 9), // Tuesday light — Wednesday is empty (calmer) but must not win
    ];
    const window = findIntentionWindow(weekEvents, TODAY_ISO, WEEK_END_ISO, WEEK_END_ISO);
    expect(window?.dateIso).toBe("2026-06-02");
  });

  it("returns null when no day within the horizon has room — stays silent, never forces it in", () => {
    const weekEvents = [1, 2, 3, 4, 5, 6, 7].flatMap((day) => [
      makeEvent(`a${day}`, day, 9),
      makeEvent(`b${day}`, day, 10),
    ]);
    const window = findIntentionWindow(weekEvents, TODAY_ISO, WEEK_END_ISO, WEEK_END_ISO);
    expect(window).toBeNull();
  });

  it("clamps the scan to the horizon — a calm day beyond dueBy doesn't count", () => {
    const weekEvents = [
      makeEvent("a", 1, 9),
      makeEvent("b", 1, 10), // Monday packed
      makeEvent("c", 2, 9),
      makeEvent("d", 2, 10), // Tuesday packed
      makeEvent("e", 3, 9),
      makeEvent("f", 3, 10), // Wednesday packed
      // Thursday (06-04) is calm, but dueBy is Wednesday — out of range.
    ];
    const window = findIntentionWindow(weekEvents, TODAY_ISO, "2026-06-03", WEEK_END_ISO);
    expect(window).toBeNull();
  });

  it("clamps the scan to the last available day when the horizon extends beyond it", () => {
    const weekEvents = [makeEvent("a", 1, 9), makeEvent("b", 1, 10)]; // Monday packed only
    // dueBy reaches into next month, but data is only available through this week.
    const window = findIntentionWindow(weekEvents, TODAY_ISO, "2026-06-30", WEEK_END_ISO);
    expect(window).toEqual({ dateIso: "2026-06-02", isToday: false });
  });
});

describe("buildIntentionLine", () => {
  it("uses today-phrasing with the this-week clause when the window is today (no)", () => {
    const line = buildIntentionLine(BERIT, { dateIso: TODAY_ISO, isToday: true }, "no", TODAY_ISO);
    expect(line).toBe(
      "Du kan vurdere om du skal ringe tante Berit — du antydet at du skulle gjøre det denne uken.",
    );
  });

  it("drops the this-week clause when the horizon is beyond this ISO week", () => {
    const nextWeek: OpenIntention = { ...BERIT, dueBy: "2026-06-10" };
    const line = buildIntentionLine(
      nextWeek,
      { dateIso: TODAY_ISO, isToday: true },
      "no",
      TODAY_ISO,
    );
    expect(line).toBe("Du kan vurdere om du skal ringe tante Berit.");
  });

  it("builds English today-phrasing", () => {
    const line = buildIntentionLine(BERIT, { dateIso: TODAY_ISO, isToday: true }, "en", TODAY_ISO);
    expect(line).toBe(
      "You might consider whether to ringe tante Berit — you hinted you'd get to it this week.",
    );
  });

  it("uses forward-looking phrasing naming tomorrow", () => {
    const line = buildIntentionLine(
      BERIT,
      { dateIso: "2026-06-02", isToday: false },
      "no",
      TODAY_ISO,
    );
    expect(line).toBe("I morgen ser rolig ut — kanskje dagen for å ringe tante Berit.");
  });

  it("uses forward-looking phrasing naming a weekday further out", () => {
    // 2026-06-04 is a Thursday.
    const line = buildIntentionLine(
      BERIT,
      { dateIso: "2026-06-04", isToday: false },
      "no",
      TODAY_ISO,
    );
    expect(line).toBe("Torsdag ser rolig ut — kanskje dagen for å ringe tante Berit.");
  });

  it("builds English forward-looking phrasing", () => {
    const line = buildIntentionLine(
      BERIT,
      { dateIso: "2026-06-04", isToday: false },
      "en",
      TODAY_ISO,
    );
    expect(line).toBe("Thursday looks calm — maybe the day to ringe tante Berit.");
  });
});
