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
  calendarName?: string,
): CalendarBriefEvent {
  const date = new Date(2026, 5, 2, hour, minute, 0, 0); // 2026-06-02 (Tuesday = tomorrow)
  return {
    id,
    title: `Event ${id}`,
    startDate: date,
    allDay,
    daysUntil: 1,
    isToday: false,
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
  const date = dayOfWeek === 6
    ? new Date(2026, 5, 6, hour, minute, 0, 0) // Saturday 2026-06-06
    : new Date(2026, 5, 7, hour, minute, 0, 0); // Sunday 2026-06-07
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

describe("buildEveningWindDown", () => {
  describe("empty events", () => {
    it("returns isEmpty: true for an empty array (en)", () => {
      const result = buildEveningWindDown([], [], "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.headline).toBe("Tomorrow looks open.");
      expect(result.body).toBe("Nothing major on the calendar.");
    });

    it("returns isEmpty: true for an empty array (no)", () => {
      const result = buildEveningWindDown([], [], "no");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(true);
      expect(result.headline).toBe("I morgen ser åpent ut.");
      expect(result.body).toBe("Ingenting på kalenderen.");
    });

    it("pillText is 'Open day tomorrow' when no events (en)", () => {
      const result = buildEveningWindDown([], [], "en");
      expect(result.pillText).toBe("Open day tomorrow");
    });

    it("pillText is 'Åpen dag i morgen' when no events (no)", () => {
      const result = buildEveningWindDown([], [], "no");
      expect(result.pillText).toBe("Åpen dag i morgen");
    });
  });

  describe("pillText populated", () => {
    it("pillText includes meeting count and lunch status (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("e2", 10, 0, false, "Jobb"),
        makeEvent("e3", 14, 0, false, "Jobb"),
      ];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.pillText).toContain("møter");
    });

    it("pillText shows meeting count when free evening (no)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb")];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.pillText).toContain("møte");
      expect(result.pillText).not.toContain("fri fra 17:00");
    });

    it("pillText shows meeting count when free evening (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.pillText).toContain("meeting");
      expect(result.pillText).not.toContain("free from 17:00");
    });

    it("pillText shows evening activity when not free evening (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("fotball", 19, 30, false, "Privat"),
      ];
      events[1].title = "Fotballtrening";
      const result = buildEveningWindDown(events, [], "no");
      expect(result.pillText).toContain("Fotballtrening");
    });
  });

  describe("free evening detection", () => {
    it("free evening: body does NOT say 'fri fra 17' when no personal events (no)", () => {
      const events = [makeEvent("e1", 9, 0, false, "Jobb"), makeEvent("e2", 14, 0, false, "Jobb")];
      const result = buildEveningWindDown(events, [], "no");
      // Work ends at 17 by default — free evening is implied, not stated
      expect(result.body).not.toContain("Fri tid fra kl. 17:00");
    });

    it("free evening: body shows weekend preview instead (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "en");
      // No "free from" message, just weekend status
      expect(result.body).not.toContain("Free from 17:00");
      expect(result.body).toContain("weekend");
    });

    it("does NOT show free evening when there is an event at 19:30 (no)", () => {
      const events = [
        makeEvent("e1", 9, 0, false, "Jobb"),
        makeEvent("fotball", 19, 30, false, "Privat"),
      ];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.body).not.toContain("Fri tid fra kl. 17:00");
    });
  });

  describe("single event", () => {
    it("mentions the first event time in the body (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.available).toBe(true);
      expect(result.isEmpty).toBe(false);
      expect(result.body).toMatch(/09:00/);
    });

    it("mentions the first event time in the body (no)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.body).toMatch(/09:00/);
    });

    it("gives a light-day headline when only one event before afternoon (en)", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "en");
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
      const result = buildEveningWindDown(events, [], "en");
      expect(result.headline).toBe("Tomorrow looks like a full morning.");
      expect(result.body).toContain("morning is fairly packed");
    });

    it("does NOT detect hasMorningBusy for 2 events before noon", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 11, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.headline).not.toBe("Tomorrow looks like a full morning.");
      expect(result.body).not.toContain("morning is fairly packed");
    });
  });

  describe("lunch availability", () => {
    it("detects hasLunchFree when no event falls within 11:00–12:00", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.body).toContain("Lunch 11–12 is free");
    });

    it("hasLunchFree is false when an event lands at 12:00 (en)", () => {
      const events = [makeEvent("e1", 12, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.body).not.toContain("Lunch looks open");
    });

    it("mentions fri lunsj in Norwegian when lunch is free", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.body).toContain("Lunsj kl. 11–12 er fri");
    });
  });

  describe("afternoon calm detection", () => {
    it("detects afternoonCalm when no events at or after 14:00", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 11, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.body).toContain("14:00");
    });

    it("does NOT show afternoonCalm when there is an event at 15:00", () => {
      const events = [makeEvent("e1", 9, 0), makeEvent("e2", 15, 0)];
      const result = buildEveningWindDown(events, [], "en");
      expect(result.body).not.toContain("After 14:00");
    });

    it("mentions ettermiddag i norsk when afternoon is calm", () => {
      const events = [makeEvent("e1", 9, 0)];
      const result = buildEveningWindDown(events, [], "no");
      expect(result.body).toContain("Ettermiddagen er rolig");
    });
  });

  describe("weekend preview in body", () => {
    it("includes weekend summary when saturday events exist (no)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Fotballkamp")];
      const result = buildEveningWindDown([makeEvent("e1", 9, 0)], weekEvents, "no");
      expect(result.body).toContain("Til helgen:");
      expect(result.body).toContain("Fotballkamp");
      expect(result.body).toContain("lørdag");
    });

    it("includes weekend summary when saturday events exist (en)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 13, 0, "Football match")];
      const result = buildEveningWindDown([makeEvent("e1", 9, 0)], weekEvents, "en");
      expect(result.body).toContain("This weekend:");
      expect(result.body).toContain("Football match");
    });

    it("empty tomorrow + weekend events → body includes weekend preview (no)", () => {
      const weekEvents = [makeWeekendEvent("s1", 6, 18, 0, "Middag med familien")];
      const result = buildEveningWindDown([], weekEvents, "no");
      expect(result.body).toContain("Til helgen:");
      expect(result.body).toContain("Middag med familien");
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
      const result = buildEveningWindDown(events, [], "en");
      expect(result.headline).toBe("Tomorrow looks like a full morning.");
      expect(result.body).not.toContain("After 14:00"); // afternoon is NOT calm
    });

    it("all-day events do not count toward timed-event patterns", () => {
      const events = [makeEvent("allday", 0, 0, true)];
      const result = buildEveningWindDown(events, [], "en");
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
