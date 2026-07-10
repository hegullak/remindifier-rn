import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { isWorkEvent } from "@/lib/brief/briefHelpers";

/**
 * Shared, typed analysis of a single day's calendar events.
 *
 * This is the single source of truth for day signals — previously duplicated
 * inside the private `analyseEvents` of morningBrief.ts and eveningWindDown.ts.
 * Interpretation copy (rhythm, breathing room, recommendation) is built on top
 * of these signals in interpretDay.ts; keep this file free of user-facing strings.
 */

/** A free window during the day, in minutes-of-day (0–1439). */
export type TimeWindow = {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
};

export type DaySignals = {
  timedEventCount: number;
  totalMeetingMinutes: number;
  firstEvent: CalendarBriefEvent | null;
  lastEvent: CalendarBriefEvent | null;
  firstStartMinutes: number | null;
  lastEndMinutes: number | null;
  /** Timed events starting before 12:00. */
  morningLoad: number;
  /** Timed events starting 12:00–16:59. */
  afternoonLoad: number;
  /** Timed events starting 17:00 or later. */
  eveningLoad: number;
  /** Any two consecutive events with < BACK_TO_BACK_MINUTES between them. */
  hasBackToBack: boolean;
  /** Free windows >= MIN_GAP_MINUTES inside the waking window. */
  gaps: TimeWindow[];
  /** No event overlaps the 11:00–12:00 lunch window. */
  lunchFree: boolean;
  /** First event starts before 08:00. */
  earlyStart: boolean;
  /** Last event ends at or after 18:00, or any event starts at/after 17:00. */
  lateEnd: boolean;
  /** Any timed event falls outside the 08:00–17:00 work window. */
  outsideWorkHours: boolean;
  /** Non-work, timed events worth calling out (lege, fysio, fotball, reise …). */
  specialEvents: CalendarBriefEvent[];
};

const DEFAULT_DURATION_MINUTES = 60;
const WAKING_START_HOUR = 8;
const WAKING_END_HOUR = 22;
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const LUNCH_START_MINUTES = 11 * 60;
const LUNCH_END_MINUTES = 12 * 60;
const MIN_GAP_MINUTES = 45;
const BACK_TO_BACK_MINUTES = 15;

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function startMinutes(event: CalendarBriefEvent): number {
  return minutesOfDay(event.startDate);
}

function endMinutes(event: CalendarBriefEvent): number {
  if (event.endDate) return minutesOfDay(event.endDate);
  return minutesOfDay(event.startDate) + DEFAULT_DURATION_MINUTES;
}

function durationMinutes(event: CalendarBriefEvent): number {
  return Math.max(0, endMinutes(event) - startMinutes(event));
}

/** Free windows >= MIN_GAP_MINUTES between events, within the waking window. */
function findGaps(sorted: CalendarBriefEvent[]): TimeWindow[] {
  const wakingStart = WAKING_START_HOUR * 60;
  const wakingEnd = WAKING_END_HOUR * 60;
  const gaps: TimeWindow[] = [];

  let cursor = sorted.length > 0 ? Math.max(wakingStart, startMinutes(sorted[0])) : wakingStart;
  // Trailing gap only — a gap before the first event isn't useful "breathing room".
  for (const event of sorted) {
    const start = startMinutes(event);
    if (start - cursor >= MIN_GAP_MINUTES) {
      gaps.push({ startMinutes: cursor, endMinutes: start, durationMinutes: start - cursor });
    }
    cursor = Math.max(cursor, endMinutes(event));
  }
  if (wakingEnd - cursor >= MIN_GAP_MINUTES && cursor < wakingEnd) {
    gaps.push({ startMinutes: cursor, endMinutes: wakingEnd, durationMinutes: wakingEnd - cursor });
  }
  return gaps;
}

export function analyzeDay(events: CalendarBriefEvent[]): DaySignals {
  const timed = events
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const firstEvent = timed[0] ?? null;
  const lastEvent = timed.length > 0 ? timed[timed.length - 1] : null;

  const totalMeetingMinutes = timed.reduce((sum, e) => sum + durationMinutes(e), 0);

  const morningLoad = timed.filter((e) => e.startDate.getHours() < 12).length;
  const afternoonLoad = timed.filter(
    (e) => e.startDate.getHours() >= 12 && e.startDate.getHours() < 17,
  ).length;
  const eveningLoad = timed.filter((e) => e.startDate.getHours() >= 17).length;

  let hasBackToBack = false;
  for (let i = 1; i < timed.length; i++) {
    if (startMinutes(timed[i]) - endMinutes(timed[i - 1]) < BACK_TO_BACK_MINUTES) {
      hasBackToBack = true;
      break;
    }
  }

  const lunchFree = !timed.some((e) => {
    const start = startMinutes(e);
    return start >= LUNCH_START_MINUTES && start < LUNCH_END_MINUTES;
  });

  const earlyStart = firstEvent !== null && firstEvent.startDate.getHours() < WORK_START_HOUR;
  const lateEnd =
    (lastEvent !== null && endMinutes(lastEvent) >= 18 * 60) ||
    timed.some((e) => e.startDate.getHours() >= WORK_END_HOUR);
  const outsideWorkHours = timed.some(
    (e) => e.startDate.getHours() < WORK_START_HOUR || e.startDate.getHours() >= WORK_END_HOUR,
  );

  const specialEvents = timed.filter((e) => !isWorkEvent(e));

  return {
    timedEventCount: timed.length,
    totalMeetingMinutes,
    firstEvent,
    lastEvent,
    firstStartMinutes: firstEvent ? startMinutes(firstEvent) : null,
    lastEndMinutes: lastEvent ? endMinutes(lastEvent) : null,
    morningLoad,
    afternoonLoad,
    eveningLoad,
    hasBackToBack,
    gaps: findGaps(timed),
    lunchFree,
    earlyStart,
    lateEnd,
    outsideWorkHours,
    specialEvents,
  };
}

export const DAY_ANALYSIS_CONSTANTS = {
  DEFAULT_DURATION_MINUTES,
  MIN_GAP_MINUTES,
  BACK_TO_BACK_MINUTES,
  WORK_START_HOUR,
  WORK_END_HOUR,
} as const;
