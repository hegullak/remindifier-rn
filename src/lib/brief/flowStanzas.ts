import { analyzeDay } from "@/lib/brief/analyzeDay";
import { buildWeekendSummary, getDayOfWeek } from "@/lib/brief/briefHelpers";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import type { FlowSummaryPeriod } from "@/lib/brief/flowSummary";

/**
 * Structured Mental Forecast for the Flow screen: one short verdict (the
 * day's character) plus up to four stanzas — morning / afternoon / evening /
 * weekend — each a couple of quiet interpreted sentences, never a raw event
 * list. "Kalenderen viser tid. echoflow forklarer dagen."
 */

export type FlowStanzaPeriod = "morning" | "afternoon" | "evening" | "weekend";

export type FlowStanza = {
  period: FlowStanzaPeriod;
  lines: string[];
};

export type FlowStanzasResult = {
  /** True when the focus day has no timed events at all. */
  isEmpty: boolean;
  /** The day's character in one short sentence — the lede. */
  verdict: string;
  stanzas: FlowStanza[];
};

const AFTERNOON_START_MINUTES = 12 * 60;
const EVENING_START_HOUR = 17;
const BUSY_HALF_DAY_EVENTS = 2;

function formatTime(date: Date, locale: "en" | "no"): string {
  return date.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesToLabel(minutes: number, locale: "en" | "no"): string {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return formatTime(d, locale);
}

function eventEnd(event: CalendarBriefEvent): Date {
  return event.endDate ?? new Date(event.startDate.getTime() + 60 * 60000);
}

function buildVerdict(
  morningBusy: boolean,
  afternoonBusy: boolean,
  eveningActive: boolean,
  period: FlowSummaryPeriod,
  locale: "en" | "no",
): string {
  let core: string;
  if (locale === "no") {
    if (morningBusy && afternoonBusy) core = "En full dag — hold overgangene enkle.";
    else if (morningBusy)
      core = eveningActive ? "Travel formiddag, aktiv kveld." : "Travel formiddag, rolig kveld.";
    else if (afternoonBusy) core = "Rolig start, tettere ettermiddag.";
    else if (eveningActive) core = "Rolig dag, med noe å se frem til i kveld.";
    else core = "En rolig dag med god plass.";
    return period === "evening"
      ? `I morgen: ${core.charAt(0).toLowerCase()}${core.slice(1)}`
      : core;
  }
  if (morningBusy && afternoonBusy) core = "A full day — keep the transitions simple.";
  else if (morningBusy)
    core = eveningActive ? "Busy morning, active evening." : "Busy morning, calm evening.";
  else if (afternoonBusy) core = "Calm start, tighter afternoon.";
  else if (eveningActive) core = "A calm day, with something to look forward to tonight.";
  else core = "A calm day with plenty of room.";
  return period === "evening" ? `Tomorrow: ${core.charAt(0).toLowerCase()}${core.slice(1)}` : core;
}

/** "Fri helg." or a one-line summary of what's on, from this week's Sat/Sun events. */
function buildWeekendStanza(weekEvents: CalendarBriefEvent[], locale: "en" | "no"): FlowStanza {
  const no = locale === "no";
  const saturday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 6 && !e.allDay);
  const sunday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 0 && !e.allDay);
  const hasWeekendEvents = saturday.length > 0 || sunday.length > 0;
  const line = hasWeekendEvents
    ? buildWeekendSummary(saturday, sunday, locale)
    : no
      ? "Fri helg."
      : "Free weekend.";
  return { period: "weekend", lines: [line] };
}

export function buildFlowStanzas(
  focusEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  period: FlowSummaryPeriod = "morning",
  weekEvents: CalendarBriefEvent[] = [],
): FlowStanzasResult {
  const signals = analyzeDay(focusEvents);
  const no = locale === "no";

  if (signals.timedEventCount === 0) {
    return {
      isEmpty: true,
      verdict:
        period === "evening"
          ? no
            ? "I morgen ser åpen ut — du styrer tempoet selv."
            : "Tomorrow looks open — you set the pace."
          : no
            ? "Dagen er åpen — du styrer tempoet selv."
            : "The day is open — you set the pace.",
      stanzas: weekEvents.length > 0 ? [buildWeekendStanza(weekEvents, locale)] : [],
    };
  }

  const timed = focusEvents
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const morningEvents = timed.filter((e) => e.startDate.getHours() < 12);
  const afternoonEvents = timed.filter(
    (e) => e.startDate.getHours() >= 12 && e.startDate.getHours() < EVENING_START_HOUR,
  );
  const eveningEvents = timed.filter((e) => e.startDate.getHours() >= EVENING_START_HOUR);

  const morningBusy = morningEvents.length >= BUSY_HALF_DAY_EVENTS;
  const afternoonBusy = afternoonEvents.length >= BUSY_HALF_DAY_EVENTS;

  const stanzas: FlowStanza[] = [];

  // Morning: name the first event, not just its time; if busy, say how long it runs.
  const morningLines: string[] = [];
  if (morningEvents.length > 0) {
    const first = morningEvents[0];
    const firstTime = formatTime(first.startDate, locale);
    morningLines.push(no ? `${first.title} kl. ${firstTime}.` : `${first.title} at ${firstTime}.`);
    if (morningBusy) {
      const last = morningEvents[morningEvents.length - 1];
      const untilTime = formatTime(eventEnd(last), locale);
      morningLines.push(no ? `Tett fram til kl. ${untilTime}.` : `Busy until ${untilTime}.`);
    }
  } else {
    morningLines.push(no ? "Rolig morgen." : "A calm morning.");
  }
  morningLines.push(
    signals.lunchFree
      ? no
        ? "Lunsjen er åpen."
        : "Lunch is still free."
      : no
        ? "Det ligger en avtale i lunsjen."
        : "A meeting sits in the lunch window.",
  );
  stanzas.push({ period: "morning", lines: morningLines });

  // Afternoon: name the anchor event(s) instead of just a count.
  const afternoonLines: string[] = [];
  if (afternoonEvents.length === 0) {
    afternoonLines.push(no ? "Ettermiddagen er åpen." : "The afternoon is open.");
  } else if (afternoonEvents.length === 1) {
    const only = afternoonEvents[0];
    const time = formatTime(only.startDate, locale);
    afternoonLines.push(no ? `${only.title} kl. ${time}.` : `${only.title} at ${time}.`);
  } else {
    const first = afternoonEvents[0];
    const last = afternoonEvents[afternoonEvents.length - 1];
    const firstTime = formatTime(first.startDate, locale);
    const untilTime = formatTime(eventEnd(last), locale);
    afternoonLines.push(
      no
        ? `${first.title} kl. ${firstTime}, deretter tett fram til kl. ${untilTime}.`
        : `${first.title} at ${firstTime}, then busy until ${untilTime}.`,
    );
  }
  const afternoonGap = signals.gaps
    .filter((g) => g.startMinutes >= AFTERNOON_START_MINUTES)
    .sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (afternoonGap && afternoonEvents.length > 0) {
    const from = minutesToLabel(afternoonGap.startMinutes, locale);
    afternoonLines.push(no ? `Etter ${from} åpner dagen seg.` : `After ${from} the day opens up.`);
  }
  stanzas.push({ period: "afternoon", lines: afternoonLines });

  // Evening: name the activities with their times, or promise calm.
  const eveningLines: string[] = [];
  if (eveningEvents.length === 0) {
    eveningLines.push(no ? "Kvelden ser rolig ut." : "The evening looks calm.");
  } else {
    for (const event of eveningEvents.slice(0, 2)) {
      const time = formatTime(event.startDate, locale);
      eveningLines.push(no ? `${event.title} kl. ${time}.` : `${event.title} at ${time}.`);
    }
    if (eveningEvents.length > 2) {
      const extra = eveningEvents.length - 2;
      eveningLines.push(no ? `+ ${extra} til.` : `+${extra} more.`);
    }
  }
  stanzas.push({ period: "evening", lines: eveningLines });

  if (weekEvents.length > 0) {
    stanzas.push(buildWeekendStanza(weekEvents, locale));
  }

  return {
    isEmpty: false,
    verdict: buildVerdict(morningBusy, afternoonBusy, eveningEvents.length > 0, period, locale),
    stanzas,
  };
}
