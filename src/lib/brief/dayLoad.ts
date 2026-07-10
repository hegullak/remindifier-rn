import type { DaySignals } from "@/lib/brief/analyzeDay";

/** Overall verdict for how demanding a day is. */
export type DayLoad = "light" | "moderate" | "busy";

export type DayLoadVerdict = {
  load: DayLoad;
  /** Machine-readable reasons that drove the verdict (for copy + debugging). */
  reasons: DayLoadReason[];
};

export type DayLoadReason =
  | "few_events"
  | "many_events"
  | "long_total_time"
  | "back_to_back"
  | "outside_work_hours"
  | "empty";

const BUSY_EVENT_COUNT = 5;
const BUSY_TOTAL_MINUTES = 5 * 60;
const LIGHT_EVENT_COUNT = 2;
const LIGHT_TOTAL_MINUTES = 2 * 60;

/**
 * Simple, explainable heuristic. Deliberately starts coarse — refine later with
 * transport buffers, prep needs, and per-user work hours.
 */
export function classifyDayLoad(signals: DaySignals): DayLoadVerdict {
  const { timedEventCount, totalMeetingMinutes, hasBackToBack, outsideWorkHours } = signals;

  if (timedEventCount === 0) {
    return { load: "light", reasons: ["empty"] };
  }

  const reasons: DayLoadReason[] = [];

  const isBusy =
    timedEventCount >= BUSY_EVENT_COUNT ||
    totalMeetingMinutes > BUSY_TOTAL_MINUTES ||
    (hasBackToBack && timedEventCount >= 4) ||
    outsideWorkHours;

  if (isBusy) {
    if (timedEventCount >= BUSY_EVENT_COUNT) reasons.push("many_events");
    if (totalMeetingMinutes > BUSY_TOTAL_MINUTES) reasons.push("long_total_time");
    if (hasBackToBack && timedEventCount >= 4) reasons.push("back_to_back");
    if (outsideWorkHours) reasons.push("outside_work_hours");
    return { load: "busy", reasons };
  }

  const isLight =
    timedEventCount <= LIGHT_EVENT_COUNT &&
    totalMeetingMinutes < LIGHT_TOTAL_MINUTES &&
    !hasBackToBack;

  if (isLight) {
    return { load: "light", reasons: ["few_events"] };
  }

  return { load: "moderate", reasons };
}

export const DAY_LOAD_THRESHOLDS = {
  BUSY_EVENT_COUNT,
  BUSY_TOTAL_MINUTES,
  LIGHT_EVENT_COUNT,
  LIGHT_TOTAL_MINUTES,
} as const;
