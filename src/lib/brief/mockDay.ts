import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

/**
 * Mock day scenarios so the Flow forecast is visible and testable without a
 * connected calendar. Five variants per load category — pressing the same
 * dev button again rotates to the next one, so repeated testing doesn't see
 * the same wording every time.
 */

export type MockDayScenario = "light" | "moderate" | "busy";

const VARIANTS_PER_SCENARIO = 5;

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

const LIGHT_VARIANTS: CalendarBriefEvent[][] = [
  [event("m-l0-1", "Morgenmøte", 9, 15, 30, "Jobb"), event("m-l0-2", "Fysio", 13, 0, 45, "Privat")],
  [
    event("m-l1-1", "Legetime", 10, 0, 30, "Privat"),
    event("m-l1-2", "Kaffe med Marte", 14, 30, 45, "Privat"),
  ],
  [event("m-l2-1", "Standup", 9, 0, 15, "Jobb")],
  [
    event("m-l3-1", "Tannlege", 8, 30, 45, "Privat"),
    event("m-l3-2", "1:1 med sjefen", 15, 0, 30, "Jobb"),
  ],
  [
    event("m-l4-1", "Levering pakke", 12, 0, 15, "Privat"),
    event("m-l4-2", "Løping", 16, 30, 40, "Privat"),
  ],
];

const MODERATE_VARIANTS: CalendarBriefEvent[][] = [
  [
    event("m-m0-1", "Standup", 8, 30, 30, "Jobb"),
    event("m-m0-2", "Kundemøte", 10, 0, 60, "Jobb"),
    event("m-m0-3", "Lunsj", 11, 30, 45, "Privat"),
    event("m-m0-4", "Planlegging", 14, 0, 60, "Jobb"),
  ],
  [
    event("m-m1-1", "Teammøte", 9, 0, 45, "Jobb"),
    event("m-m1-2", "Fysio", 12, 0, 45, "Privat"),
    event("m-m1-3", "Kundesamtale", 14, 30, 30, "Jobb"),
    event("m-m1-4", "Fotballtrening", 18, 0, 90, "Privat"),
  ],
  [
    event("m-m2-1", "Sprint-planlegging", 9, 30, 60, "Jobb"),
    event("m-m2-2", "Legetime", 11, 0, 30, "Privat"),
    event("m-m2-3", "Designgjennomgang", 13, 30, 60, "Jobb"),
  ],
  [
    event("m-m3-1", "Morgentrening", 7, 0, 45, "Privat"),
    event("m-m3-2", "Statusmøte", 9, 30, 30, "Jobb"),
    event("m-m3-3", "Kundelunsj", 12, 0, 75, "Jobb"),
    event("m-m3-4", "Henting barnehage", 16, 0, 30, "Privat"),
  ],
  [
    event("m-m4-1", "Styremøte", 10, 0, 90, "Jobb"),
    event("m-m4-2", "Middag hos Ida", 19, 0, 90, "Privat"),
  ],
];

const BUSY_VARIANTS: CalendarBriefEvent[][] = [
  [
    event("m-b0-1", "Levering / morgenrunde", 7, 30, 45, "Privat"),
    event("m-b0-2", "Standup", 9, 0, 30, "Jobb"),
    event("m-b0-3", "Designgjennomgang", 9, 30, 60, "Jobb"),
    event("m-b0-4", "Kundemøte", 10, 30, 60, "Jobb"),
    event("m-b0-5", "Lunsjmøte", 11, 30, 45, "Jobb"),
    event("m-b0-6", "Fysio", 13, 0, 45, "Privat"),
    event("m-b0-7", "Fotball", 17, 30, 90, "Privat"),
  ],
  [
    event("m-b1-1", "Morgentrening", 6, 30, 45, "Privat"),
    event("m-b1-2", "Standup", 8, 30, 30, "Jobb"),
    event("m-b1-3", "Kundemøte 1", 9, 0, 60, "Jobb"),
    event("m-b1-4", "Kundemøte 2", 10, 0, 60, "Jobb"),
    event("m-b1-5", "Arbeidslunsj", 11, 0, 45, "Jobb"),
    event("m-b1-6", "Sprint-retro", 12, 0, 60, "Jobb"),
    event("m-b1-7", "Legetime", 14, 0, 30, "Privat"),
    event("m-b1-8", "Fotballtrening", 18, 0, 90, "Privat"),
  ],
  [
    event("m-b2-1", "Tidlig flyavgang - innsjekk", 6, 0, 30, "Privat"),
    event("m-b2-2", "Kundemøte", 9, 0, 60, "Jobb"),
    event("m-b2-3", "Styremøte", 10, 30, 90, "Jobb"),
    event("m-b2-4", "Lunsjmøte", 12, 30, 45, "Jobb"),
    event("m-b2-5", "Designgjennomgang", 13, 30, 60, "Jobb"),
    event("m-b2-6", "1:1", 15, 0, 30, "Jobb"),
    event("m-b2-7", "Henting barnehage", 16, 30, 30, "Privat"),
    event("m-b2-8", "Fellesøving korps", 18, 30, 90, "Privat"),
  ],
  [
    event("m-b3-1", "Standup", 8, 0, 15, "Jobb"),
    event("m-b3-2", "Kundemøte", 8, 30, 60, "Jobb"),
    event("m-b3-3", "Planleggingsmøte", 9, 45, 60, "Jobb"),
    event("m-b3-4", "Lunsj med teamet", 11, 30, 60, "Jobb"),
    event("m-b3-5", "Designgjennomgang", 13, 0, 90, "Jobb"),
    event("m-b3-6", "Fysio", 14, 45, 45, "Privat"),
    event("m-b3-7", "Middag hos Ida", 19, 0, 90, "Privat"),
  ],
  [
    event("m-b4-1", "Morgenmøte", 7, 45, 30, "Jobb"),
    event("m-b4-2", "Kundemøte", 8, 30, 60, "Jobb"),
    event("m-b4-3", "Intervju", 10, 0, 60, "Jobb"),
    event("m-b4-4", "Arbeidslunsj", 11, 30, 45, "Jobb"),
    event("m-b4-5", "Sprint-planlegging", 12, 30, 60, "Jobb"),
    event("m-b4-6", "Kundemøte 2", 14, 0, 60, "Jobb"),
    event("m-b4-7", "Tannlege", 15, 30, 30, "Privat"),
    event("m-b4-8", "Fotballkamp", 18, 0, 90, "Privat"),
  ],
];

const SCENARIO_VARIANTS: Record<MockDayScenario, CalendarBriefEvent[][]> = {
  light: LIGHT_VARIANTS,
  moderate: MODERATE_VARIANTS,
  busy: BUSY_VARIANTS,
};

/** Rotates through 5 variants per scenario — index wraps with modulo. */
export function mockDayEventsVariant(
  scenario: MockDayScenario,
  index: number,
): CalendarBriefEvent[] {
  const variants = SCENARIO_VARIANTS[scenario];
  return variants[
    ((index % VARIANTS_PER_SCENARIO) + VARIANTS_PER_SCENARIO) % VARIANTS_PER_SCENARIO
  ];
}

/** First variant of a scenario — kept for callers that don't need rotation. */
export function mockDayEvents(scenario: MockDayScenario = "moderate"): CalendarBriefEvent[] {
  return mockDayEventsVariant(scenario, 0);
}
