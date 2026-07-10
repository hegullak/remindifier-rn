import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

/**
 * Mock day scenarios so the Briefs UI is visible and testable without a
 * connected calendar. Replaced by real device events once wired through
 * useBriefData; keep the shapes identical to CalendarBriefEvent.
 */

export type MockDayScenario = "light" | "moderate" | "busy";

function at(hour: number, minute: number, durationMinutes: number): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + durationMinutes);
  return { start, end };
}

function event(
  id: string,
  title: string,
  hour: number,
  minute: number,
  durationMinutes: number,
  calendarName: string,
): CalendarBriefEvent {
  const { start, end } = at(hour, minute, durationMinutes);
  return {
    id,
    title,
    startDate: start,
    endDate: end,
    allDay: false,
    daysUntil: 0,
    isToday: true,
    calendarName,
  };
}

const LIGHT_DAY: CalendarBriefEvent[] = [
  event("m-l1", "Morgenmøte", 9, 15, 30, "Jobb"),
  event("m-l2", "Fysio", 13, 0, 45, "Privat"),
];

const MODERATE_DAY: CalendarBriefEvent[] = [
  event("m-m1", "Standup", 8, 30, 30, "Jobb"),
  event("m-m2", "Kundemøte", 10, 0, 60, "Jobb"),
  event("m-m3", "Lunsj", 11, 30, 45, "Privat"),
  event("m-m4", "Planlegging", 14, 0, 60, "Jobb"),
];

const BUSY_DAY: CalendarBriefEvent[] = [
  event("m-b1", "Levering / morgenrunde", 7, 30, 45, "Privat"),
  event("m-b2", "Standup", 9, 0, 30, "Jobb"),
  event("m-b3", "Designgjennomgang", 9, 30, 60, "Jobb"),
  event("m-b4", "Kundemøte", 10, 30, 60, "Jobb"),
  event("m-b5", "Lunsjmøte", 11, 30, 45, "Jobb"),
  event("m-b6", "Fysio", 13, 0, 45, "Privat"),
  event("m-b7", "Fotball", 17, 30, 90, "Privat"),
];

const SCENARIOS: Record<MockDayScenario, CalendarBriefEvent[]> = {
  light: LIGHT_DAY,
  moderate: MODERATE_DAY,
  busy: BUSY_DAY,
};

export function mockDayEvents(scenario: MockDayScenario = "moderate"): CalendarBriefEvent[] {
  return SCENARIOS[scenario];
}
