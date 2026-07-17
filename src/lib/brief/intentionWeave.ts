import { analyzeDay } from "@/lib/brief/analyzeDay";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getISOWeek } from "@/lib/brief/calendarWeek";
import type { FlowSummary, FlowSummaryPeriod } from "@/lib/brief/flowSummary";

/**
 * Weaves one open intention ("ringe tante Berit denne uken") into the
 * flow-summary — but only when the day has room. This is the companion
 * behaviour: echoflow remembers on your behalf and offers, never nags.
 * Opportunity, not failure: a packed day simply stays silent.
 */

export type OpenIntention = {
  id: string;
  text: string;
  /** Local date (YYYY-MM-DD) the intention should be done by. */
  dueBy: string;
};

/** Max timed events for a day to still count as "has room". */
const ROOM_MAX_TIMED_EVENTS = 4;

/**
 * A day has room when it is empty, or lightly scheduled without
 * back-to-back pressure. Deliberately conservative — surfacing an
 * intention on a packed day would turn the companion into a nag.
 */
export function hasRoomForIntention(events: CalendarBriefEvent[]): boolean {
  const signals = analyzeDay(events);
  if (signals.timedEventCount === 0) return true;
  return signals.timedEventCount <= ROOM_MAX_TIMED_EVENTS && !signals.hasBackToBack;
}

/** First open intention whose horizon hasn't passed — repo order is (dueBy, createdAt). */
export function pickOpenIntention(open: OpenIntention[], todayIso: string): OpenIntention | null {
  return open.find((i) => i.dueBy >= todayIso) ?? null;
}

function isSameIsoWeek(aIso: string, bIso: string): boolean {
  const a = new Date(`${aIso}T12:00:00`);
  const b = new Date(`${bIso}T12:00:00`);
  return a.getFullYear() === b.getFullYear() && getISOWeek(a) === getISOWeek(b);
}

/** The companion sentence for one open intention — rendered as its own quiet line on Flow. */
export function buildIntentionLine(
  intention: OpenIntention,
  locale: "en" | "no",
  period: FlowSummaryPeriod,
  todayIso: string,
): string {
  const thisWeek = isSameIsoWeek(intention.dueBy, todayIso);
  if (locale === "no") {
    const lead =
      period === "evening"
        ? `I morgen kan det bli tid til å ${intention.text}`
        : `Du kan vurdere om du skal ${intention.text}`;
    return thisWeek ? `${lead} — du antydet at du skulle gjøre det denne uken.` : `${lead}.`;
  }
  const lead =
    period === "evening"
      ? `Tomorrow could leave time to ${intention.text}`
      : `You might consider whether to ${intention.text}`;
  return thisWeek ? `${lead} — you hinted you'd get to it this week.` : `${lead}.`;
}

/**
 * Returns a copy of the summary with the intention appended to the body.
 * Forces isEmpty=false so an open day still shows the flow-summary block —
 * an empty day is exactly when there is most room for an intention.
 */
export function weaveIntentionIntoFlowSummary(
  summary: FlowSummary,
  intention: OpenIntention,
  locale: "en" | "no",
  period: FlowSummaryPeriod,
  todayIso: string,
): FlowSummary {
  if (!summary.available) return summary;
  const sentence = buildIntentionLine(intention, locale, period, todayIso);
  return {
    ...summary,
    isEmpty: false,
    body: summary.body ? `${summary.body}\n${sentence}` : sentence,
  };
}
