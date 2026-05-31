import {
  buildEveningWindDown,
  buildEveningWindDownUnavailable,
} from "@/lib/brief/eveningWindDown";
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
    daysUntil: 1,
    isToday: false,
  };
}

describe("buildEveningWindDown", () => {
  describe("empty events", () => {
    it("returns isEmpty: true for an empty array (en)", () => {
      const result = buildEveningWindDown([], "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.headline).toBe("Tomorrow looks open.");
      expect(result.body).toBe("Nothing major on the calendar.");
    });

    it("returns isEmpty: true for an empty array (no)", () => {
      const result = buildEveningWindDown([], "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.headline).toBe("I morgen ser åpent ut.");
      expect(result.body).toBe("Ingenting på kalenderen.");
    });
  });

  describe("single event", () => {
    it("mentions the first event time in the body (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.body).toMatch(/09:00/);
    });

    it("mentions the first event time in the body (no)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, "no");
      expect(result.body).toMatch(/09:00/);
    });

    it("gives a light-day headline when only one event before afternoon (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.headline).toBe("Tomorrow looks fairly light.");
    });
  });

  describe("busy morning detection", () => {
    it("detects hasMorningBusy when 3+ events before 12:00", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 30),
        makeEvent("e3", 10, 0),
        makeEvent("e4", 11, 0),
      ];
      const result = buildEveningWindDown(events, "en");
      expect(result.headline).toBe("Tomorrow looks like a full morning.");
      expect(result.body).toContain("morning is fairly packed");
    });

    it("does NOT detect hasMorningBusy for 2 events before noon", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 11, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.headline).not.toBe("Tomorrow looks like a full morning.");
      expect(result.body).not.toContain("morning is fairly packed");
    });
  });

  describe("lunch availability", () => {
    it("detects hasLunchFree when no event falls within 11:30–13:30", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.body).toContain("Lunch looks open");
    });

    it("hasLunchFree is false when an event lands at 12:00 (en)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.body).not.toContain("Lunch looks open");
    });

    it("mentions fri lunsj in Norwegian when lunch is free", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, "no");
      expect(result.body).toContain("Lunsj ser fri ut");
    });
  });

  describe("afternoon calm detection", () => {
    it("detects afternoonCalm when no events at or after 14:00", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 11, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.body).toContain("14:00");
    });

    it("does NOT show afternoonCalm when there is an event at 15:00", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, "en");
      expect(result.body).not.toContain("After 14:00");
    });

    it("mentions ettermiddag i norsk when afternoon is calm", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, "no");
      expect(result.body).toContain("Ettermiddagen er rolig");
    });
  });

  describe("mixed scenario", () => {
    it("full morning + busy afternoon gives manageable headline", () => {
      const events = [
        makeEvent("e1", 8, 0),
        makeEvent("e2", 9, 0),
        makeEvent("e3", 10, 0),
        makeEvent("e4", 11, 0),
        makeEvent("e5", 14, 30),
        makeEvent("e6", 16, 0),
      ];
      const result = buildEveningWindDown(events, "en");
      expect(result.headline).toBe("Tomorrow looks like a full morning.");
      expect(result.body).not.toContain("After 14:00"); // afternoon is NOT calm
    });

    it("all-day events do not count toward timed-event patterns", () => {
      const events = [makeEvent("allday", 0, 0, true)];
      const result = buildEveningWindDown(events, "en");
      // allDay events are included in eventCount but excluded from timed analysis
      expect(result.isEmpty).toBe(false);
      // no timed events → no first-event mention
      expect(result.body).not.toContain("Your first event is at");
    });
  });

  describe("unavailable fallback", () => {
    it("returns available: false (en)", () => {
      const result = buildEveningWindDownUnavailable("en");
      expect(result.available).toBe(false);
      expect(result.headline).toBe("Calendar data unavailable.");
    });

    it("returns available: false (no)", () => {
      const result = buildEveningWindDownUnavailable("no");
      expect(result.available).toBe(false);
      expect(result.headline).toBe("Kalenderdata utilgjengelig.");
    });
  });
});
