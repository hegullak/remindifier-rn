import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { buildFlowStanzas } from "@/lib/brief/flowStanzas";

function makeEvent(
  id: string,
  hour: number,
  minute = 0,
  title = `Event ${id}`,
): CalendarBriefEvent {
  const startDate = new Date(2026, 5, 1, hour, minute, 0, 0);
  return {
    id,
    title,
    startDate,
    endDate: new Date(startDate.getTime() + 60 * 60000),
    allDay: false,
    daysUntil: 0,
    isToday: true,
  };
}

function stanza(result: ReturnType<typeof buildFlowStanzas>, period: string) {
  const found = result.stanzas.find((s) => s.period === period);
  if (!found) throw new Error(`missing stanza: ${period}`);
  return found;
}

describe("buildFlowStanzas", () => {
  it("returns an open-day verdict with no stanzas for an empty day", () => {
    const result = buildFlowStanzas([], "no");
    expect(result.isEmpty).toBe(true);
    expect(result.verdict).toContain("åpen");
    expect(result.stanzas).toHaveLength(0);
  });

  it("prefixes the verdict with tomorrow in the evening period", () => {
    const result = buildFlowStanzas([], "no", "evening");
    expect(result.verdict).toContain("I morgen");
    const en = buildFlowStanzas([makeEvent("a", 9)], "en", "evening");
    expect(en.verdict.startsWith("Tomorrow:")).toBe(true);
  });

  it("always produces morning, afternoon and evening stanzas for a non-empty day", () => {
    const result = buildFlowStanzas([makeEvent("a", 9)], "no");
    expect(result.stanzas.map((s) => s.period)).toEqual(["morning", "afternoon", "evening"]);
  });

  it("names the first event time and free lunch in the morning stanza", () => {
    const result = buildFlowStanzas([makeEvent("a", 9)], "no");
    const morning = stanza(result, "morning");
    expect(morning.lines.join(" ")).toContain("09:00");
    expect(morning.lines.join(" ")).toContain("Lunsjen er åpen");
  });

  it("flags a lunch meeting instead of free lunch", () => {
    const result = buildFlowStanzas([makeEvent("a", 11, 30)], "no");
    expect(stanza(result, "morning").lines.join(" ")).toContain("lunsjen");
    expect(stanza(result, "morning").lines.join(" ")).not.toContain("Lunsjen er åpen");
  });

  it("calls out an open afternoon when nothing is scheduled there", () => {
    const result = buildFlowStanzas([makeEvent("a", 9)], "no");
    expect(stanza(result, "afternoon").lines.join(" ")).toContain("Ettermiddagen er åpen");
  });

  it("names evening activities with their times", () => {
    const result = buildFlowStanzas(
      [makeEvent("a", 9), makeEvent("b", 18, 0, "Fotballtrening")],
      "no",
    );
    expect(stanza(result, "evening").lines.join(" ")).toContain("Fotballtrening kl. 18:00.");
  });

  it("promises a calm evening when nothing is scheduled", () => {
    const result = buildFlowStanzas([makeEvent("a", 9)], "no");
    expect(stanza(result, "evening").lines.join(" ")).toContain("Kvelden ser rolig ut");
  });

  it("verdict reflects a busy morning with a calm rest of day", () => {
    const result = buildFlowStanzas([makeEvent("a", 8), makeEvent("b", 10)], "no");
    expect(result.verdict).toContain("Travel formiddag");
  });

  it("verdict reflects a calm start with a tight afternoon", () => {
    const result = buildFlowStanzas([makeEvent("a", 13), makeEvent("b", 15)], "no");
    expect(result.verdict).toContain("Rolig start");
  });

  it("builds English copy end to end", () => {
    const result = buildFlowStanzas(
      [makeEvent("a", 8), makeEvent("b", 10), makeEvent("c", 18, 30, "Football practice")],
      "en",
    );
    expect(result.verdict).toContain("Busy morning");
    expect(stanza(result, "morning").lines.join(" ")).toContain("First event at 08:00.");
    expect(stanza(result, "evening").lines.join(" ")).toContain("Football practice at 18:30.");
  });

  describe("weekend stanza", () => {
    // 2026-06-01 is a Monday; Saturday is 2026-06-06, Sunday 2026-06-07.
    function makeWeekendEvent(id: string, day: number, hour: number, title: string) {
      const startDate = new Date(2026, 5, day, hour, 0, 0, 0);
      return {
        id,
        title,
        startDate,
        endDate: new Date(startDate.getTime() + 60 * 60000),
        allDay: false,
        daysUntil: day - 1,
        isToday: false,
      };
    }

    it("is omitted when weekEvents is not passed", () => {
      const result = buildFlowStanzas([makeEvent("a", 9)], "no");
      expect(result.stanzas.find((s) => s.period === "weekend")).toBeUndefined();
    });

    it("reports a free weekend when no Sat/Sun events exist", () => {
      const result = buildFlowStanzas([makeEvent("a", 9)], "no", "morning", [makeEvent("a", 9)]);
      expect(stanza(result, "weekend").lines.join(" ")).toBe("Fri helg.");
    });

    it("names a Saturday event", () => {
      const weekEvents = [makeEvent("a", 9), makeWeekendEvent("sat", 6, 13, "Fotballkamp")];
      const result = buildFlowStanzas([makeEvent("a", 9)], "no", "morning", weekEvents);
      expect(stanza(result, "weekend").lines.join(" ")).toContain("Fotballkamp lørdag kl. 13:00.");
    });

    it("appears even on an empty focus day when weekEvents is passed", () => {
      const weekEvents = [makeWeekendEvent("sun", 7, 11, "Brunsj")];
      const result = buildFlowStanzas([], "no", "morning", weekEvents);
      expect(result.isEmpty).toBe(true);
      expect(stanza(result, "weekend").lines.join(" ")).toContain("Brunsj søndag kl. 11:00.");
    });
  });
});
