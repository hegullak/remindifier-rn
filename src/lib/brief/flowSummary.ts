import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { buildEveningWindDown, buildEveningWindDownUnavailable } from "@/lib/brief/eveningWindDown";
import { buildMorningBrief, buildMorningBriefUnavailable } from "@/lib/brief/morningBrief";

/**
 * Flow-summary: the day's narrative at the top of the brief.
 *
 * Single generic entry point over the two period variants — the morning
 * briefing (buildMorningBrief) and the evening wind-down (buildEveningWindDown).
 * They share an identical output shape, so callers only need this module.
 */

export type FlowSummaryPeriod = "morning" | "evening";

export type FlowSummary = {
  available: boolean;
  isEmpty: boolean;
  /** Short at-a-glance label, e.g. "4 meetings · lunch free". */
  pillText: string;
  headline: string;
  body: string;
};

/**
 * @param focusEvents Today's events for the morning variant; tomorrow's for the evening variant.
 * @param weekEvents  The rest of the week, for weekend/look-ahead context.
 */
export function buildFlowSummary(
  period: FlowSummaryPeriod,
  focusEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  today = new Date(),
): FlowSummary {
  return period === "evening"
    ? buildEveningWindDown(focusEvents, weekEvents, locale, today)
    : buildMorningBrief(focusEvents, weekEvents, locale, today);
}

export function buildFlowSummaryUnavailable(
  period: FlowSummaryPeriod,
  locale: "en" | "no",
): FlowSummary {
  return period === "evening"
    ? buildEveningWindDownUnavailable(locale)
    : buildMorningBriefUnavailable(locale);
}
