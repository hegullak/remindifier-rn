import { analyzeDay } from "@/lib/brief/analyzeDay";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getISOWeek } from "@/lib/brief/calendarWeek";

/**
 * The companion loop: echoflow remembers a soft intention ("ring tante Berit")
 * on the user's behalf and offers it back only when there is real room for
 * it — never nags, never forces it onto a packed day. This is the mechanism
 * behind the "mentally prepared, not just reminded" principle: knowing in
 * advance which day has room removes the running mental check of "do I have
 * capacity for this today?" that makes dreadful-but-necessary things (calls,
 * follow-ups, maintenance, admin) feel heavier than they actually are.
 */

export type OpenIntention = {
  id: string;
  text: string;
  /** Local date (YYYY-MM-DD) the intention should be done by. */
  dueBy: string;
  /** Talking points / prep notes, one per line — the mental-preparation payload. */
  notes?: string | null;
};

/** Notes split into displayable talking-point lines. */
export function intentionTalkingPoints(intention: OpenIntention): string[] {
  return (intention.notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Which day within the horizon has room, and whether that's today. */
export type IntentionWindow = {
  dateIso: string;
  isToday: boolean;
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

function localDateKeyFor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Scans forward from today through the intention's horizon — clamped to the
 * last day we actually have calendar data for — and returns the first day
 * with room. The nearest calm day wins; this never skips ahead looking for
 * a "better" one further out. Returns null when no day in range has room:
 * the companion stays silent rather than forcing the intention in.
 */
export function findIntentionWindow(
  weekEvents: CalendarBriefEvent[],
  todayIso: string,
  dueByIso: string,
  lastAvailableIso: string,
): IntentionWindow | null {
  const scanEndIso = dueByIso < lastAvailableIso ? dueByIso : lastAvailableIso;
  if (scanEndIso < todayIso) return null;

  const cursor = new Date(`${todayIso}T00:00:00`);
  const end = new Date(`${scanEndIso}T00:00:00`);

  while (cursor.getTime() <= end.getTime()) {
    const dateIso = localDateKeyFor(cursor);
    const dayEvents = weekEvents.filter(
      (e) => e.startDate.toDateString() === cursor.toDateString(),
    );
    if (hasRoomForIntention(dayEvents)) {
      return { dateIso, isToday: dateIso === todayIso };
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/** "Torsdag" / "I morgen" / "Today" — the found window's day, for the forward-looking line. */
function dayName(dateIso: string, todayIso: string, locale: "en" | "no"): string {
  const tomorrow = new Date(`${todayIso}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateIso === localDateKeyFor(tomorrow)) return locale === "no" ? "I morgen" : "Tomorrow";
  const d = new Date(`${dateIso}T12:00:00`);
  const label = d.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", { weekday: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * The companion sentence for one open intention, given which day was found
 * to have room. Two registers: "you have room today" when the window is
 * today, or a forward-looking preview ("Torsdag ser rolig ut...") when the
 * nearest calm day is later in the horizon — shown even while today is busy,
 * since knowing the day in advance is itself the reassurance.
 */
export function buildIntentionLine(
  intention: OpenIntention,
  window: IntentionWindow,
  locale: "en" | "no",
  todayIso: string,
): string {
  const thisWeek = isSameIsoWeek(intention.dueBy, todayIso);

  if (window.isToday) {
    if (locale === "no") {
      const lead = `Du kan vurdere om du skal ${intention.text}`;
      return thisWeek ? `${lead} — du antydet at du skulle gjøre det denne uken.` : `${lead}.`;
    }
    const lead = `You might consider whether to ${intention.text}`;
    return thisWeek ? `${lead} — you hinted you'd get to it this week.` : `${lead}.`;
  }

  const day = dayName(window.dateIso, todayIso, locale);
  return locale === "no"
    ? `${day} ser rolig ut — kanskje dagen for å ${intention.text}.`
    : `${day} looks calm — maybe the day to ${intention.text}.`;
}
