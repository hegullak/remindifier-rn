import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

export type EveningWindDownSummary = {
  available: boolean;
  isEmpty: boolean;
  pillText: string;
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
  hasFreeEvening: boolean;
  workEventCount: number;
  personalEventNames: string[];
  hasEveningActivity: boolean;
  eveningActivities: string[];
  hasWeekendEvents: boolean;
  weekendSummary: string;
};

function formatTime(date: Date, locale: "en" | "no"): string {
  return date.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

function isWorkEvent(e: CalendarBriefEvent): boolean {
  const name = (e.calendarName ?? "").toLowerCase();
  return name.includes("jobb") || name.includes("work") || name.includes("job");
}

function buildWeekendSummary(
  saturday: CalendarBriefEvent[],
  sunday: CalendarBriefEvent[],
  locale: "en" | "no",
): string {
  const parts: string[] = [];
  for (const e of saturday.slice(0, 1)) {
    if (locale === "no") {
      parts.push(`${e.title} lørdag kl. ${formatTime(e.startDate, "no")}.`);
    } else {
      parts.push(`${e.title} on Saturday at ${formatTime(e.startDate, "en")}.`);
    }
  }
  for (const e of sunday.slice(0, 1)) {
    if (locale === "no") {
      parts.push(`${e.title} søndag kl. ${formatTime(e.startDate, "no")}.`);
    } else {
      parts.push(`${e.title} on Sunday at ${formatTime(e.startDate, "en")}.`);
    }
  }
  return parts.join(" ");
}

function analyseEvents(
  events: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
): WindDownSignals {
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
  const hasFreeEvening = !timed.some((e) => e.startDate.getHours() >= 17);

  const workEvents = timed.filter((e) => isWorkEvent(e));
  const personalEvents = timed.filter((e) => !isWorkEvent(e));
  const personalEventNames = personalEvents.map((e) => e.title).slice(0, 2);

  const hasEveningActivity = timed.some((e) => e.startDate.getHours() >= 17);
  const eveningActivities = timed
    .filter((e) => e.startDate.getHours() >= 17)
    .map((e) => e.title);

  // Weekend signals from weekEvents
  const saturday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 6 && !e.allDay);
  const sunday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 0 && !e.allDay);
  const hasWeekendEvents = saturday.length > 0 || sunday.length > 0;
  const weekendSummary = buildWeekendSummary(saturday, sunday, locale);

  return {
    eventCount: events.length,
    firstEvent,
    lastEvent,
    hasLunchFree,
    hasMorningBusy,
    afternoonCalm,
    hasFreeEvening,
    workEventCount: workEvents.length,
    personalEventNames,
    hasEveningActivity,
    eveningActivities,
    hasWeekendEvents,
    weekendSummary,
  };
}

function buildEnglish(signals: WindDownSignals): EveningWindDownSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    afternoonCalm,
    hasFreeEvening,
    workEventCount,
    hasEveningActivity,
    eveningActivities,
    hasWeekendEvents,
    weekendSummary,
  } = signals;

  if (eventCount === 0) {
    return {
      available: true,
      isEmpty: true,
      pillText: "Open day tomorrow",
      headline: "Tomorrow looks open.",
      body: hasWeekendEvents
        ? `Nothing major on the calendar. This weekend: ${weekendSummary}`
        : "Nothing major on the calendar.",
    };
  }

  // pillText
  const meetingCount = workEventCount > 0 ? workEventCount : eventCount;
  const lunchPart = hasLunchFree ? "lunch free" : "lunch busy";
  let pillParts: string[];
  if (hasMorningBusy) {
    pillParts = [`${meetingCount} meetings · ${lunchPart}`];
  } else {
    const countPart = meetingCount === 1 ? "1 meeting" : `${meetingCount} meetings`;
    pillParts = [`${countPart} · ${lunchPart}`];
  }
  if (hasFreeEvening) {
    pillParts.push("free from 17:00");
  } else if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    pillParts.push(`${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")}`);
  }
  const pillText = pillParts.join(" · ");

  // headline
  let headline: string;
  if (hasMorningBusy) {
    headline = "Tomorrow looks like a full morning.";
  } else if (afternoonCalm && eventCount <= 2) {
    headline = "Tomorrow looks fairly light.";
  } else {
    headline = "Tomorrow looks fairly manageable.";
  }

  // body
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

  if (hasFreeEvening) {
    parts.push("Free from 17:00 — a good chance to train or wind down.");
  } else if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const isPersonal = !isWorkEvent(signals.lastEvent);
    if (isPersonal) {
      parts.push(
        `${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")}.`,
      );
    }
  }

  // Weekend preview
  if (hasWeekendEvents) {
    parts.push(`This weekend: ${weekendSummary}`);
  }

  return {
    available: true,
    isEmpty: false,
    pillText,
    headline,
    body: parts.join(" "),
  };
}

function buildNorwegian(signals: WindDownSignals): EveningWindDownSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    afternoonCalm,
    hasFreeEvening,
    workEventCount,
    hasEveningActivity,
    eveningActivities,
    hasWeekendEvents,
    weekendSummary,
  } = signals;

  if (eventCount === 0) {
    return {
      available: true,
      isEmpty: true,
      pillText: "Åpen dag i morgen",
      headline: "I morgen ser åpent ut.",
      body: hasWeekendEvents
        ? `Ingenting på kalenderen. Til helgen: ${weekendSummary}`
        : "Ingenting på kalenderen.",
    };
  }

  // pillText
  const meetingCount = workEventCount > 0 ? workEventCount : eventCount;
  const lunchPart = hasLunchFree ? "lunsj fri" : "lunsj opptatt";
  let pillParts: string[];
  if (hasMorningBusy) {
    pillParts = [`${meetingCount} møter · ${lunchPart}`];
  } else {
    const countPart = meetingCount === 1 ? "1 møte" : `${meetingCount} møter`;
    pillParts = [`${countPart} · ${lunchPart}`];
  }
  if (hasFreeEvening) {
    pillParts.push("fri fra 17:00");
  } else if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    pillParts.push(`${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")}`);
  }
  const pillText = pillParts.join(" · ");

  // headline
  let headline: string;
  if (hasMorningBusy) {
    headline = "I morgen ser ut som en travel formiddag.";
  } else if (afternoonCalm && eventCount <= 2) {
    headline = "I morgen ser ganske rolig ut.";
  } else {
    headline = "I morgen ser ganske overkommelig ut.";
  }

  // body
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

  if (hasFreeEvening) {
    parts.push("Fri tid fra kl. 17:00 — god mulighet for trening eller en rolig kveld.");
  } else if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const isPersonal = !isWorkEvent(signals.lastEvent);
    if (isPersonal) {
      parts.push(
        `${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")}.`,
      );
    }
  }

  // Weekend preview
  if (hasWeekendEvents) {
    parts.push(`Til helgen: ${weekendSummary}`);
  }

  return {
    available: true,
    isEmpty: false,
    pillText,
    headline,
    body: parts.join(" "),
  };
}

export function buildEveningWindDown(
  tomorrowEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
): EveningWindDownSummary {
  const signals = analyseEvents(tomorrowEvents, weekEvents, locale);
  return locale === "no" ? buildNorwegian(signals) : buildEnglish(signals);
}

export function buildEveningWindDownUnavailable(locale: "en" | "no"): EveningWindDownSummary {
  return {
    available: false,
    isEmpty: false,
    pillText: locale === "no" ? "Kalenderdata utilgjengelig" : "Calendar data unavailable",
    headline: locale === "no" ? "Kalenderdata utilgjengelig." : "Calendar data unavailable.",
    body: "",
  };
}
