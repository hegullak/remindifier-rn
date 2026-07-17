import {
  buildWeekendSummary,
  formatTime,
  getDayOfWeek,
  isWorkEvent,
} from "@/lib/brief/briefHelpers";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import {
  formatHolidayLine,
  getUpcomingHoliday,
  type UpcomingHolidayInfo,
} from "@/lib/brief/norwegianHolidays";

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
  workEventCount: number;
  personalEventNames: string[];
  hasEveningActivity: boolean;
  eveningActivities: string[];
  hasWeekendEvents: boolean;
  weekendSummary: string;
};

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

  // Lunch window: 11:00–12:00 (user's actual lunch time)
  const lunchStart = 11 * 60; // 11:00
  const lunchEnd = 12 * 60; // 12:00
  const hasLunchFree = !timed.some((e) => {
    const start = e.startDate.getHours() * 60 + e.startDate.getMinutes();
    return start >= lunchStart && start < lunchEnd;
  });

  const afternoonCalm = !timed.some((e) => e.startDate.getHours() >= 14);

  const workEvents = timed.filter((e) => isWorkEvent(e));
  const personalEvents = timed.filter((e) => !isWorkEvent(e));
  const personalEventNames = personalEvents.map((e) => e.title).slice(0, 2);

  // Work hours 08-17. Free evening = no events (work OR personal) after 17:00.
  // If there IS a personal event after 17, that's a named activity (football etc).
  const hasEveningActivity = personalEvents.some((e) => e.startDate.getHours() >= 17);
  const eveningActivities = personalEvents
    .filter((e) => e.startDate.getHours() >= 17)
    .map((e) => e.title);
  // Weekend signals — show upcoming Saturday/Sunday events
  const saturday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 6 && !e.allDay);
  const sunday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 0 && !e.allDay);
  const hasWeekendEvents = saturday.length > 0 || sunday.length > 0;
  const weekendSummary = hasWeekendEvents
    ? buildWeekendSummary(saturday, sunday, locale)
    : locale === "no"
      ? "Fri helg."
      : "Free weekend.";

  return {
    eventCount: events.length,
    firstEvent,
    lastEvent,
    hasLunchFree,
    hasMorningBusy,
    afternoonCalm,
    workEventCount: workEvents.length,
    personalEventNames,
    hasEveningActivity,
    eveningActivities,
    hasWeekendEvents,
    weekendSummary,
  };
}

function buildEnglish(
  signals: WindDownSignals,
  holiday: UpcomingHolidayInfo | null,
): EveningWindDownSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    afternoonCalm,
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
        ? `Nothing major on the calendar.\nThis weekend: ${weekendSummary}`
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
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
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

  parts.push(hasLunchFree ? "Lunch 11–12 is free." : "Meeting during tomorrow's lunch.");

  if (afternoonCalm) {
    parts.push("After 14:00 the day gets calmer.");
  }

  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    parts.push(
      `${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")} — something to look forward to! 🎉`,
    );
  } else if (!hasEveningActivity) {
    parts.push("Evening is free — good time to train or unwind. 🌙");
  }

  // Weekend preview — always show (free or busy)
  if (hasWeekendEvents) {
    parts.push(`This weekend: ${weekendSummary}`);
  } else {
    parts.push("Free weekend ahead — recharge! ⚡");
  }

  if (holiday) {
    parts.push(formatHolidayLine(holiday, "en"));
    if (holiday.bridgeDaySuggestion) parts.push(holiday.bridgeDaySuggestion);
  }

  return {
    available: true,
    isEmpty: false,
    pillText,
    headline,
    body: parts.join("\n"),
  };
}

function buildNorwegian(
  signals: WindDownSignals,
  holiday: UpcomingHolidayInfo | null,
): EveningWindDownSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    afternoonCalm,
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
        ? `Ingenting på kalenderen.\nTil helgen: ${weekendSummary}`
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
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
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

  parts.push(hasLunchFree ? "Lunsj kl. 11–12 er fri." : "Møte i lunsjtiden i morgen.");

  if (afternoonCalm) {
    parts.push("Ettermiddagen er rolig fra kl. 14:00.");
  }

  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    parts.push(
      `${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")} — noe å glede seg til! 🎉`,
    );
  } else if (!hasEveningActivity) {
    parts.push("Kvelden er fri — god tid til trening eller å koble av. 🌙");
  }

  // Weekend preview — always show
  if (hasWeekendEvents) {
    parts.push(`Til helgen: ${weekendSummary}`);
  } else {
    parts.push("Fri helg i vente — lad opp! ⚡");
  }

  if (holiday) {
    parts.push(formatHolidayLine(holiday, "no"));
    if (holiday.bridgeDaySuggestion) parts.push(holiday.bridgeDaySuggestion);
  }

  return {
    available: true,
    isEmpty: false,
    pillText,
    headline,
    body: parts.join("\n"),
  };
}

export function buildEveningWindDown(
  tomorrowEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  today = new Date(),
): EveningWindDownSummary {
  const signals = analyseEvents(tomorrowEvents, weekEvents, locale);
  // Look ahead up to 10 days for tomorrow's holiday context
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const holiday = getUpcomingHoliday(tomorrow, locale, 14);
  return locale === "no" ? buildNorwegian(signals, holiday) : buildEnglish(signals, holiday);
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
