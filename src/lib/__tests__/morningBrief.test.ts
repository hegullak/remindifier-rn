import {
  buildMorningBrief,
  buildMorningBriefUnavailable,
} from "@/lib/brief/morningBrief";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

function makeEvent(
  id: string,
  hour: number,
  minute = 0,
  allDay = false,
  calendarName?: string,
): CalendarBriefEvent {
  const date = new Date(2026, 5, 1, hour, minute, 0, 0); // 2026-06-01 (Monday)
  return {
    id,
    title: `Event ${id}`,
    startDate: date,
    allDay,
    daysUntil: 0,
    isToday: true,
    calendarName,
  };
}

function makeWeekendEvent(
  id: string,
  dayOfWeek: 6 | 0, // 6=Sat, 0=Sun
  hour: number,
  minute = 0,
  title?: string,
): CalendarBriefEvent {
  // Find next Saturday or Sunday from a fixed date
  const base = new Date(2026, 5, 6, hour, minute, 0, 0); // 2026-06-06 is a Saturday
  const date = dayOfWeek === 6 ? new Date(2026, 5, 6, hour, minute, 0, 0) : new Date(2026, 5, 7, hour, minute, 0, 0);
  return {
    id,
    title: title ?? `Weekend ${id}`,
    startDate: date,
    allDay: false,
    daysUntil: dayOfWeek === 6 ? 5 : 6,
    isToday: false,
    calendarName: "Privat",
  };
}

describe("buildMorningBrief", () => {
  describe("empty events", () => {
    it("returns isEmpty: true and correct pillText for empty array (no)", () => {
      const result = buildMorningBrief([], [], "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.pillText).toBe("Åpen dag · fri helg");
      expect(result.headline).toBe("En åpen dag venter.");
    });

    it("returns isEmpty: true with free weekend pill (no)", () => {
      const result = buildMorningBrief([], [], "no");
      expect(result.pillText).toContain("fri helg");
    });

    it("returns isEmpty: true and correct pillText for empty array (en)", () => {
      const result = buildMorningBrief([], [], "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.pillText).toContain("Open day");
      expect(result.headline).toBe("An open day ahead.");
    });

    it("open day with weekend events — pillText does NOT include free weekend (no)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Fotballkamp")];
      const result = buildMorningBrief([], weekEvents, "no");
      expect(result.pillText).toBe("Åpen dag");
    });
  });

  describe("single morning event", () => {
    it("mentions the first event time in the body (no)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, [], "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.body).toMatch(/09:00/);
    });

    it("mentions the first event time in the body (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, [], "en");
      expect(result.body).toMatch(/09:00/);
    });

    it("includes count in pillText for single work event (no)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb")];
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).toContain("1 møte");
    });

    it("includes count in pillText for single event (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, [], "en");
      expect(result.pillText).toContain("1 meeting");
    });
  });

  describe("hasMorningBusy — 3+ events before noon", () => {
    it("detects busy morning for 3+ events before 12:00 (no)", () => {
      const events = [
        makeEvent("e1", 8, 0, false, "Jobb"),
        makeEvent("e2", 9, 30, false, "Jobb"),
        makeEvent("e3", 10, 0, false, "Jobb"),
        makeEvent("e4", 11, 0, false, "Jobb"),
      ];
      const result = buildMorningBrief(events, [], "no");
      expect(result.headline).toBe("Travel formiddag i vente.");
      expect(result.body).toContain("Formiddagen er ganske full");
    });

    it("detects busy morning for 3+ events before 12:00 (en)", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 0),
        makeEvent("e3", 10, 30),
      ];
      const result = buildMorningBrief(events, [], "en");
      expect(result.headline).toBe("A busy morning ahead.");
      expect(result.body).toContain("morning is fairly packed");
    });

    it("pillText prefixed with 'Travel dag' for busy morning (no)", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 0),
        makeEvent("e3", 10, 0),
      ];
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).toMatch(/^Travel dag/);
    });
  });

  describe("lunch event presence", () => {
    it("detects hasLunchFree when no event in 11:30–13:30 window", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).toContain("lunsj fri");
    });

    it("hasLunchFree is false when event at 12:00 (no)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).not.toContain("lunsj fri");
      expect(result.body).not.toContain("Lunsj ser fri ut");
    });

    it("hasLunchFree is false when event at 12:00 (en)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildMorningBrief(events, [], "en");
      expect(result.body).not.toContain("Lunch looks free");
    });
  });

  describe("dayEndsEarly — last WORK event before 15:00", () => {
    it("detects dayEndsEarly when last work event starts before 15:00 (no)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb"), makeEvent("e2", 11, 0, false, "Jobb")];
      const result = buildMorningBrief(events, [], "no");
      expect(result.headline).toBe("Dagen avsluttes tidlig.");
    });

    it("detects dayEndsEarly for single work event at 9:00 (en)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb")];
      const result = buildMorningBrief(events, [], "en");
      expect(result.headline).toBe("Day wraps up early.");
    });
  });

  describe("dayEndsLate — work event at 17:00+ (overtime)", () => {
    it("detects overtime when work event is at 17:00 (no)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb"), makeEvent("e2", 17, 0, false, "Jobb")];
      const result = buildMorningBrief(events, [], "no");
      expect(result.body).toContain("Møter etter arbeidstid");
    });

    it("detects overtime when work event is at 18:30 (en)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb"), makeEvent("e2", 18, 30, false, "Jobb")];
      const result = buildMorningBrief(events, [], "en");
      expect(result.body).toContain("Meetings running past 17:00");
    });
  });

  describe("pillText format", () => {
    it("includes meeting count in pillText (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("e2", 14, 0, false, "Jobb"),
        makeEvent("e3", 16, 0, false, "Jobb"),
      ];
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).toContain("3 møter");
    });

    it("includes meeting count in pillText (en)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 14, 0)];
      const result = buildMorningBrief(events, [], "en");
      expect(result.pillText).toContain("2 meetings");
    });

    it("all-day events count toward eventCount but not timed patterns", () => {
      const events = [makeEvent("allday", 0, 0, true)];
      const result = buildMorningBrief(events, [], "no");
      // allDay events included in eventCount, so isEmpty is false
      expect(result.isEmpty).toBe(false);
      // but no timed first-event mention
      expect(result.body).not.toContain("Første møte");
    });
  });

  describe("evening personal activity", () => {
    it("mentions personal evening event in body (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("fotball", 19, 30, false, "Privat"),
      ];
      // Override title for the evening event
      events[1].title = "Fotballtrening";
      const result = buildMorningBrief(events, [], "no");
      expect(result.body).toContain("Fotballtrening");
      expect(result.body).toContain("i kveld");
    });

    it("evening activity appears in pillText (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("fotball", 19, 30, false, "Privat"),
      ];
      events[1].title = "Fotballtrening";
      const result = buildMorningBrief(events, [], "no");
      expect(result.pillText).toContain("Fotballtrening");
    });
  });

  describe("weekend events from weekEvents", () => {
    it("includes weekend summary in body when saturday events exist (no)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Fotballkamp")];
      const result = buildMorningBrief([makeEvent("e1", 9, 0)], weekEvents, "no");
      expect(result.body).toContain("Til helgen:");
      expect(result.body).toContain("Fotballkamp");
      expect(result.body).toContain("lørdag");
    });

    it("includes weekend summary in body when saturday events exist (en)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Football match")];
      const result = buildMorningBrief([makeEvent("e1", 9, 0)], weekEvents, "en");
      expect(result.body).toContain("This weekend:");
      expect(result.body).toContain("Football match");
      expect(result.body).toContain("Saturday");
    });

    it("free weekend → 'Fri helg' in pillText for open day (no)", () => {
      const result = buildMorningBrief([], [], "no");
      expect(result.pillText).toContain("fri helg");
    });

    it("weekend events detected → weekendSummary NOT in empty pillText (no)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Middag")];
      const result = buildMorningBrief([], weekEvents, "no");
      // open day but has weekend events → pill is just "Åpen dag"
      expect(result.pillText).toBe("Åpen dag");
      // but body contains weekend info
      expect(result.body).toContain("Til helgen:");
    });
  });

  describe("unavailable fallback", () => {
    it("returns available: false (no)", () => {
      const result = buildMorningBriefUnavailable("no");
      expect(result.available).toBe(false);
      expect(result.pillText).toBe("Kalender utilgjengelig");
    });

    it("returns available: false (en)", () => {
      const result = buildMorningBriefUnavailable("en");
      expect(result.available).toBe(false);
      expect(result.pillText).toBe("Calendar unavailable");
    });
  });
});
