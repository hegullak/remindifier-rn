import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import {
  getUpcomingHoliday,
  formatHolidayLine,
  type UpcomingHolidayInfo,
} from "@/lib/brief/norwegianHolidays";

export type MorningBriefSummary = {
  available: boolean;
  isEmpty: boolean;
  pillText: string;
  headline: string;
  body: string;
};

type MorningSignals = {
  eventCount: number;
  firstEvent: CalendarBriefEvent | null;
  lastEvent: CalendarBriefEvent | null;
  hasLunchFree: boolean;
  hasMorningBusy: boolean;
  dayEndsEarly: boolean;
  dayEndsLate: boolean;
  hasEveningActivity: boolean;
  eveningActivities: string[];
  hasPersonalEventsToday: boolean;
  personalEventNames: string[];
  workEventCount: number;
  hasWeekendEvents: boolean;
  weekendSummary: string;
};

function formatTime(date: Date, locale: "en" | "no"): string {
  return date.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getHour(date: Date): number {
  return date.getHours();
}

function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

function isAllDay(event: CalendarBriefEvent): boolean {
  return event.allDay;
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
): MorningSignals {
  const timed = events.filter((e) => !e.allDay);

  const firstEvent = timed.length > 0 ? timed[0] : null;
  const lastEvent = timed.length > 0 ? timed[timed.length - 1] : null;

  const eventsBeforeNoon = timed.filter((e) => e.startDate.getHours() < 12);
  const hasMorningBusy = eventsBeforeNoon.length >= 3;

  // Lunch window: 11:00–12:00 (user's actual lunch time)
  const lunchStart = 11 * 60; // 11:00
  const lunchEnd = 12 * 60;   // 12:00
  const hasLunchFree = !timed.some((e) => {
    const start = e.startDate.getHours() * 60 + e.startDate.getMinutes();
    return start >= lunchStart && start < lunchEnd;
  });

  const workEvents = timed.filter((e) => isWorkEvent(e));
  const personalEvents = timed.filter((e) => !isWorkEvent(e));
  const hasPersonalEventsToday = personalEvents.length > 0;
  const personalEventNames = personalEvents.map((e) => e.title).slice(0, 2);

  // Work hours assumed 08-17. Early finish = last work event before 15:00.
  const lastWorkEvent = workEvents.length > 0 ? workEvents[workEvents.length - 1] : null;
  const dayEndsEarly = lastWorkEvent !== null && lastWorkEvent.startDate.getHours() < 15;
  // Overtime = work event starting at or after 17:00
  const dayEndsLate = workEvents.some((e) => e.startDate.getHours() >= 17);

  // Evening = personal time after 17:00 (always available unless personal event there)
  const hasEveningActivity = personalEvents.some((e) => getHour(e.startDate) >= 17);
  const eveningActivities = personalEvents
    .filter((e) => getHour(e.startDate) >= 17)
    .map((e) => e.title);

  // Weekend: only mention if there ARE events OR it's Friday
  const todayDow = new Date().getDay();
  const isFriday = todayDow === 5;
  const saturday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 6 && !isAllDay(e));
  const sunday = weekEvents.filter((e) => getDayOfWeek(e.startDate) === 0 && !isAllDay(e));
  const hasWeekendEvents = saturday.length > 0 || sunday.length > 0;
  // Show weekend info on Fridays or when there are weekend events
  const showWeekend = isFriday || hasWeekendEvents;
  const weekendSummary = hasWeekendEvents
    ? buildWeekendSummary(saturday, sunday, locale)
    : locale === "no" ? "Fri helg." : "Free weekend.";

  return {
    eventCount: events.length,
    firstEvent,
    lastEvent,
    hasLunchFree,
    hasMorningBusy,
    dayEndsEarly,
    dayEndsLate,
    hasEveningActivity,
    eveningActivities,
    hasPersonalEventsToday,
    personalEventNames,
    workEventCount: workEvents.length,
    hasWeekendEvents: showWeekend,
    weekendSummary,
  };
}

function buildEnglish(signals: MorningSignals, holiday: UpcomingHolidayInfo | null): MorningBriefSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    dayEndsEarly,
    dayEndsLate,
    hasEveningActivity,
    eveningActivities,
    workEventCount,
    hasWeekendEvents,
    weekendSummary,
  } = signals;

  if (eventCount === 0) {
    const holidayLine = holiday ? formatHolidayLine(holiday, "en") : null;
    return {
      available: true,
      isEmpty: true,
      pillText: hasWeekendEvents ? "Open day" : "Open day · free weekend",
      headline: "An open day ahead — enjoy the space! ☀️",
      body: [
        "Nothing on the calendar today.",
        hasWeekendEvents ? `This weekend: ${weekendSummary}` : "Free weekend ahead.",
        holidayLine,
        holiday?.bridgeDaySuggestion,
      ].filter(Boolean).join(" "),
    };
  }

  // pillText
  const lunchPart = hasLunchFree ? " · lunch free" : " · lunch busy";
  const meetingCount = workEventCount > 0 ? workEventCount : eventCount;
  const countPart = meetingCount === 1 ? "1 meeting" : `${meetingCount} meetings`;
  const busyPart = hasMorningBusy ? "Busy day" : null;
  let pillParts: string[];
  if (busyPart) {
    pillParts = [`${busyPart} · ${meetingCount} meetings`];
  } else {
    pillParts = [`${countPart}${lunchPart}`];
  }
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent && signals.lastEvent.startDate.getHours() >= 17) {
    pillParts.push(`${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")}`);
  }
  const pillText = pillParts.join(" · ");

  // headline
  let headline: string;
  if (hasMorningBusy && dayEndsLate) {
    headline = "Full day ahead — you've got this! 💪";
  } else if (hasMorningBusy) {
    headline = "Busy morning, but the evening is yours. 🌿";
  } else if (dayEndsEarly) {
    headline = "Short day — time for what matters. ☀️";
  } else if (eventCount <= 2) {
    headline = "Calm day ahead — room to breathe. 😌";
  } else {
    headline = "Day looks manageable. Good start! 👍";
  }

  // body
  const parts: string[] = [];
  if (firstEvent) parts.push(`First meeting at ${formatTime(firstEvent.startDate, "en")}.`);
  if (hasMorningBusy) parts.push("The morning is packed — take short breaks.");
  parts.push(hasLunchFree ? "Lunch 11–12 is free. ✓" : "Meeting during lunch — remember to eat.");
  if (dayEndsEarly && signals.lastEvent) {
    parts.push(`Done with meetings at ${formatTime(signals.lastEvent.startDate, "en")} — early finish!`);
  } else if (dayEndsLate) {
    parts.push("Meetings past 17:00 today — slightly longer day.");
  }
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const evtHour = signals.lastEvent.startDate.getHours();
    if (evtHour >= 17 && !isWorkEvent(signals.lastEvent)) {
      parts.push(`${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")} this evening — something to look forward to! 🎉`);
    }
  }
  if (hasWeekendEvents) {
    parts.push(`This weekend: ${weekendSummary}`);
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
    body: parts.join(" "),
  };
}

function buildNorwegian(signals: MorningSignals, holiday: UpcomingHolidayInfo | null): MorningBriefSummary {
  const {
    eventCount,
    firstEvent,
    hasMorningBusy,
    hasLunchFree,
    dayEndsEarly,
    dayEndsLate,
    hasEveningActivity,
    eveningActivities,
    workEventCount,
    hasWeekendEvents,
    weekendSummary,
  } = signals;

  if (eventCount === 0) {
    const holidayLine = holiday ? formatHolidayLine(holiday, "no") : null;
    return {
      available: true,
      isEmpty: true,
      pillText: hasWeekendEvents ? "Åpen dag" : "Åpen dag · fri helg",
      headline: "En åpen dag venter — nyt friheten! ☀️",
      body: [
        "Ingenting på programmet i dag.",
        hasWeekendEvents ? `Til helgen: ${weekendSummary}` : "Fri helg i vente.",
        holidayLine,
        holiday?.bridgeDaySuggestion,
      ].filter(Boolean).join(" "),
    };
  }

  // pillText
  const lunchPart = hasLunchFree ? " · lunsj fri" : " · lunsj opptatt";
  const meetingCount = workEventCount > 0 ? workEventCount : eventCount;
  const countPart = meetingCount === 1 ? "1 møte" : `${meetingCount} møter`;
  const busyPart = hasMorningBusy ? "Travel dag" : null;
  let pillParts: string[];
  if (busyPart) {
    pillParts = [`${busyPart} · ${meetingCount} møter`];
  } else {
    pillParts = [`${countPart}${lunchPart}`];
  }
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent && signals.lastEvent.startDate.getHours() >= 17) {
    pillParts.push(`${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")}`);
  }
  const pillText = pillParts.join(" · ");

  // headline — varm og motiverende
  let headline: string;
  if (hasMorningBusy && dayEndsLate) {
    headline = "Full dag foran deg — du klarer det! 💪";
  } else if (hasMorningBusy) {
    headline = "Travel formiddag, men kvelden er din. 🌿";
  } else if (dayEndsEarly) {
    headline = "Kort dag — god tid til det som teller. ☀️";
  } else if (eventCount <= 2) {
    headline = "Rolig dag i vente — rom til å puste. 😌";
  } else {
    headline = "Dagen ser overkommelig ut. God start! 👍";
  }

  // body
  const parts: string[] = [];

  if (firstEvent) {
    parts.push(`Første møte kl. ${formatTime(firstEvent.startDate, "no")}.`);
  }
  if (hasMorningBusy) {
    parts.push("Formiddagen er full — husk å ta korte pauser.");
  }
  parts.push(hasLunchFree ? "Lunsj kl. 11–12 er fri. ✓" : "Møte i lunsjtiden — husk å spise noe.");
  if (dayEndsEarly && signals.lastEvent) {
    parts.push(`Ferdig med møter kl. ${formatTime(signals.lastEvent.startDate, "no")} — tidlig slutt!`);
  } else if (dayEndsLate) {
    parts.push("Møter etter 17 i dag — litt lengre dag enn vanlig.");
  }
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const evtHour = signals.lastEvent.startDate.getHours();
    if (evtHour >= 17 && !isWorkEvent(signals.lastEvent)) {
      parts.push(`${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")} i kveld — noe å glede seg til! 🎉`);
    }
  }
  if (hasWeekendEvents) {
    parts.push(`Til helgen: ${weekendSummary}`);
  } else if (!hasWeekendEvents && signals.hasWeekendEvents === false) {
    parts.push("Fri helg i vente.");
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
    body: parts.join(" "),
  };
}

export function buildMorningBrief(
  todayEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  today = new Date(),
): MorningBriefSummary {
  const signals = analyseEvents(todayEvents, weekEvents, locale);
  const holiday = getUpcomingHoliday(today, locale, 21);
  return locale === "no" ? buildNorwegian(signals, holiday) : buildEnglish(signals, holiday);
}

export function buildMorningBriefUnavailable(locale: "en" | "no"): MorningBriefSummary {
  return {
    available: false,
    isEmpty: false,
    pillText: locale === "no" ? "Kalender utilgjengelig" : "Calendar unavailable",
    headline: locale === "no" ? "Kalenderdata utilgjengelig." : "Calendar data unavailable.",
    body: "",
  };
}
