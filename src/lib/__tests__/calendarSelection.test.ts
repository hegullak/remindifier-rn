import {
  isCalendarEnabled,
  pickCalendarsForBrief,
  toggleCalendarId,
} from "@/lib/brief/calendarSelection";

describe("calendarSelection", () => {
  const available = [
    { id: "a", title: "Jobb" },
    { id: "b", title: "Privat" },
    { id: "c", title: "Familie" },
  ];

  it("uses all calendars when selection is undefined", () => {
    expect(pickCalendarsForBrief(available, undefined)).toHaveLength(3);
    expect(isCalendarEnabled("b", undefined, ["a", "b", "c"])).toBe(true);
  });

  it("filters to saved selection", () => {
    const picked = pickCalendarsForBrief(available, ["a", "c"]);
    expect(picked.map((c) => c.id)).toEqual(["a", "c"]);
    expect(isCalendarEnabled("b", ["a", "c"], ["a", "b", "c"])).toBe(false);
  });

  it("toggles a calendar id", () => {
    expect(toggleCalendarId(undefined, ["a", "b"], "b", false)).toEqual(["a"]);
    expect(toggleCalendarId(["a"], ["a", "b"], "b", true)).toEqual(["a", "b"]);
  });
});
