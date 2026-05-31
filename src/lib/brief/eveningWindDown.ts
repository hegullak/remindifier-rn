import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

export type EveningWindDownSummary = {
  available: boolean;
  isEmpty: boolean;
  headline: string;
  body: string;
};

type WindDownSignals = {
  eventCount: number;
  firstEvent: CalendarBriefEvent | null;
  lastEvent: CalendarBriefEvent | null;
  hasLunchFree: boolean;
  hasMorningBusy: boolean;
  afternoonCalm: boolean;
};

function formatTime(date: Date, locale: "en" | "no"): string {
  return date.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function analyseEvents(events: CalendarBriefEvent[]): WindDownSignals {
  const timed = events.filter((e) => !e.allDay);

  const firstEvent = timed.length > 0 ? timed[0] : null;
  const lastEvent = timed.length > 0 ? timed[timed.length - 1] : null;

  const eventsBeforeNoon = timed.filter((e) => e.startDate.getHours() < 12);
  const hasMorningBusy = eventsBeforeNoon.length >= 3;

  const lunchStart = 11 * 60 + 30; // 11:30
  const lunchEnd = 13 * 60 + 30; // 13:30
  const hasLunchFree = !timed.some((e) => {
    const mins = e.startDate.getHours() * 60 + e.startDate.getMinutes();
    return mins >= lunchStart && mins <= lunchEnd;
  });

  const afternoonCalm = !timed.some((e) => e.startDate.getHours() >= 14);

  return {
    eventCount: events.length,
    firstEvent,
    lastEvent,
    hasLunchFree,
    hasMorningBusy,
    afternoonCalm,
  };
}

function buildEnglish(signals: WindDownSignals): EveningWindDownSummary {
  const { eventCount, firstEvent, hasMorningBusy, hasLunchFree, afternoonCalm } = signals;

  if (eventCount === 0) {
    return {
      available: true,
      isEmpty: true,
      headline: "Tomorrow looks open.",
      body: "Nothing major on the calendar.",
    };
  }

  let headline: string;
  if (hasMorningBusy) {
    headline = "Tomorrow looks like a full morning.";
  } else if (afternoonCalm && eventCount <= 2) {
    headline = "Tomorrow looks fairly light.";
  } else {
    headline = "Tomorrow looks fairly manageable.";
  }

  const parts: string[] = [];

  if (firstEvent) {
    parts.push(`Your first event is at ${formatTime(firstEvent.startDate, "en")}.`);
  }

  if (hasMorningBusy) {
    parts.push("The morning is fairly packed.");
  }

  if (hasLunchFree) {
    parts.push("Lunch looks open.");
  }

  if (afternoonCalm) {
    parts.push("After 14:00 the day gets calmer.");
  }

  return {
    available: true,
    isEmpty: false,
    headline,
    body: parts.join(" "),
  };
}

function buildNorwegian(signals: WindDownSignals): EveningWindDownSummary {
  const { eventCount, firstEvent, hasMorningBusy, hasLunchFree, afternoonCalm } = signals;

  if (eventCount === 0) {
    return {
      available: true,
      isEmpty: true,
      headline: "I morgen ser åpent ut.",
      body: "Ingenting på kalenderen.",
    };
  }

  let headline: string;
  if (hasMorningBusy) {
    headline = "I morgen ser ut som en travel formiddag.";
  } else if (afternoonCalm && eventCount <= 2) {
    headline = "I morgen ser ganske rolig ut.";
  } else {
    headline = "I morgen ser ganske overkommelig ut.";
  }

  const parts: string[] = [];

  if (firstEvent) {
    parts.push(`Første hendelse er kl. ${formatTime(firstEvent.startDate, "no")}.`);
  }

  if (hasMorningBusy) {
    parts.push("Formiddagen er ganske full.");
  }

  if (hasLunchFree) {
    parts.push("Lunsj ser fri ut.");
  }

  if (afternoonCalm) {
    parts.push("Ettermiddagen er rolig fra kl. 14:00.");
  }

  return {
    available: true,
    isEmpty: false,
    headline,
    body: parts.join(" "),
  };
}

export function buildEveningWindDown(
  tomorrowEvents: CalendarBriefEvent[],
  locale: "en" | "no",
): EveningWindDownSummary {
  const signals = analyseEvents(tomorrowEvents);
  return locale === "no" ? buildNorwegian(signals) : buildEnglish(signals);
}

export function buildEveningWindDownUnavailable(locale: "en" | "no"): EveningWindDownSummary {
  return {
    available: false,
    isEmpty: false,
    headline: locale === "no" ? "Kalenderdata utilgjengelig." : "Calendar data unavailable.",
    body: "",
  };
}
