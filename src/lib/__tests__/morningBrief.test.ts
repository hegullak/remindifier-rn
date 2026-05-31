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
): CalendarBriefEvent {
  const date = new Date(2026, 5, 1, hour, minute, 0, 0); // 2026-06-01
  return {
    id,
    title: `Event ${id}`,
    startDate: date,
    allDay,
    daysUntil: 0,
    isToday: true,
  };
}

describe("buildMorningBrief", () => {
  describe("empty events", () => {
    it("returns isEmpty: true and correct pillText for empty array (no)", () => {
      const result = buildMorningBrief([], "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.pillText).toBe("Åpen dag");
      expect(result.headline).toBe("En åpen dag venter.");
    });

    it("returns isEmpty: true and correct pillText for empty array (en)", () => {
      const result = buildMorningBrief([], "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.pillText).toBe("Open day");
      expect(result.headline).toBe("An open day ahead.");
    });
  });

  describe("single morning event", () => {
    it("mentions the first event time in the body (no)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.body).toMatch(/09:00/);
    });

    it("mentions the first event time in the body (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, "en");
      expect(result.body).toMatch(/09:00/);
    });

    it("includes count in pillText for single event (no)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.pillText).toContain("1 møte");
    });

    it("includes count in pillText for single event (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, "en");
      expect(result.pillText).toContain("1 meeting");
    });
  });

  describe("hasMorningBusy — 3+ events before noon", () => {
    it("detects busy morning for 3+ events before 12:00 (no)", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 30),
        makeEvent("e3", 10, 0),
        makeEvent("e4", 11, 0),
      ];
      const result = buildMorningBrief(events, "no");
      expect(result.headline).toBe("Travel formiddag i vente.");
      expect(result.body).toContain("Formiddagen er ganske full");
    });

    it("detects busy morning for 3+ events before 12:00 (en)", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 0),
        makeEvent("e3", 10, 30),
      ];
      const result = buildMorningBrief(events, "en");
      expect(result.headline).toBe("A busy morning ahead.");
      expect(result.body).toContain("morning is fairly packed");
    });

    it("pillText prefixed with 'Travel dag' for busy morning (no)", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 0),
        makeEvent("e3", 10, 0),
      ];
      const result = buildMorningBrief(events, "no");
      expect(result.pillText).toMatch(/^Travel dag/);
    });
  });

  describe("lunch event presence", () => {
    it("detects hasLunchFree when no event in 11:30–13:30 window", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.pillText).toContain("lunsj fri");
    });

    it("hasLunchFree is false when event at 12:00 (no)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.pillText).not.toContain("lunsj fri");
      expect(result.body).not.toContain("Lunsj ser fri ut");
    });

    it("hasLunchFree is false when event at 12:00 (en)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildMorningBrief(events, "en");
      expect(result.body).not.toContain("Lunch looks free");
    });
  });

  describe("dayEndsEarly — last event before 15:00", () => {
    it("detects dayEndsEarly when last timed event starts before 15:00 (no)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 11, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.headline).toBe("Dagen avsluttes tidlig.");
    });

    it("detects dayEndsEarly for single event at 9:00 (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildMorningBrief(events, "en");
      expect(result.headline).toBe("Day wraps up early.");
    });
  });

  describe("dayEndsLate — last event at or after 17:00", () => {
    it("detects dayEndsLate when last event is at 17:00 or later (no)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 17, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.body).toContain("Siste møte går sent");
    });

    it("detects dayEndsLate when last event is at 17:00 or later (en)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 18, 30)];
      const result = buildMorningBrief(events, "en");
      expect(result.body).toContain("Last meeting runs until late");
    });
  });

  describe("pillText format", () => {
    it("includes meeting count in pillText (no)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 14, 0), makeEvent("e3", 16, 0)];
      const result = buildMorningBrief(events, "no");
      expect(result.pillText).toContain("3 møter");
    });

    it("includes meeting count in pillText (en)", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 14, 0)];
      const result = buildMorningBrief(events, "en");
      expect(result.pillText).toContain("2 meetings");
    });

    it("all-day events count toward eventCount but not timed patterns", () => {
      const events = [makeEvent("allday", 0, 0, true)];
      const result = buildMorningBrief(events, "no");
      // allDay events included in eventCount, so isEmpty is false
      expect(result.isEmpty).toBe(false);
      // but no timed first-event mention
      expect(result.body).not.toContain("Første møte");
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
