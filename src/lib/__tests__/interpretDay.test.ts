import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { interpretDay } from "@/lib/brief/interpretDay";
import { mockDayEvents } from "@/lib/brief/mockDay";

function ev(
  id: string,
  hour: number,
  minute: number,
  durationMinutes: number,
  title: string,
  calendarName = "Jobb",
  daysUntil = 0,
): CalendarBriefEvent {
  const start = new Date(2026, 6, 10, hour, minute, 0, 0);
  start.setDate(start.getDate() + daysUntil);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return {
    id,
    title,
    startDate: start,
    endDate: end,
    allDay: false,
    daysUntil,
    isToday: daysUntil === 0,
    calendarName,
  };
}

describe("interpretDay", () => {
  it("produces all six interpreted fields for a moderate day", () => {
    const r = interpretDay(mockDayEvents("moderate"), mockDayEvents("moderate"), "no", "morning");
    expect(r.load).toBe("moderate");
    expect(r.loadLabel).toBe("Moderat dag");
    expect(r.rhythm.length).toBeGreaterThan(0);
    expect(r.breathingRoom.length).toBeGreaterThan(0);
    expect(r.recommendation.length).toBeGreaterThan(0);
  });

  it("localizes the load label", () => {
    const no = interpretDay(mockDayEvents("busy"), mockDayEvents("busy"), "no", "morning");
    const en = interpretDay(mockDayEvents("busy"), mockDayEvents("busy"), "en", "morning");
    expect(no.loadLabel).toBe("Hektisk dag");
    expect(en.loadLabel).toBe("Busy day");
  });

  it("surfaces non-work events as important today with a prep hint", () => {
    const events = [ev("a", 9, 0, 30, "Standup", "Jobb"), ev("b", 13, 0, 45, "Fysio", "Privat")];
    const r = interpretDay(events, events, "no", "morning");
    const fysio = r.importantToday.find((i) => i.title === "Fysio");
    expect(fysio).toBeDefined();
    expect(fysio?.hint).toBeTruthy();
    expect(r.importantToday.some((i) => i.title === "Standup")).toBe(false);
  });

  it("lists special events later in the week with a weekday label", () => {
    const today = [ev("t", 9, 0, 30, "Standup", "Jobb")];
    const week = [...today, ev("w", 9, 0, 45, "Tannlege", "Privat", 3)];
    const r = interpretDay(today, week, "no", "morning");
    expect(r.laterThisWeek.some((i) => i.title === "Tannlege")).toBe(true);
    expect(r.laterThisWeek.every((i) => Boolean(i.dayLabel))).toBe(true);
  });

  it("switches to a tomorrow-focused evening variant", () => {
    const r = interpretDay(mockDayEvents("light"), mockDayEvents("light"), "no", "evening");
    expect(r.period).toBe("evening");
    expect(r.loadReason).toContain("morgen");
  });
});
