import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

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

function buildEnglish(signals: MorningSignals): MorningBriefSummary {
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
    const freeWeekend = !hasWeekendEvents;
    return {
      available: true,
      isEmpty: true,
      pillText: freeWeekend ? "Open day · free weekend" : "Open day",
      headline: "An open day ahead.",
      body: hasWeekendEvents
        ? `Nothing on the calendar today. This weekend: ${weekendSummary}`
        : "Nothing on the calendar. The day is yours.",
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
  if (hasEveningActivity && eveningActivities[0]) {
    const t = eveningActivities[0];
    const firstEvening = signals.firstEvent; // we need time of evening event
    // find the evening event object
    // We'll just show time from the raw timed list via lastEvent if it's evening
    if (signals.lastEvent && signals.lastEvent.startDate.getHours() >= 17) {
      pillParts.push(`${t} at ${formatTime(signals.lastEvent.startDate, "en")}`);
    }
  }
  const pillText = pillParts.join(" · ");

  // headline
  let headline: string;
  if (hasMorningBusy && dayEndsLate) {
    headline = "A full day ahead.";
  } else if (hasMorningBusy) {
    headline = "A busy morning ahead.";
  } else if (dayEndsEarly) {
    headline = "Day wraps up early.";
  } else if (eventCount <= 2) {
    headline = "A calm day ahead.";
  } else {
    headline = "Day looks manageable.";
  }

  // body
  const parts: string[] = [];

  if (firstEvent) {
    parts.push(`First meeting at ${formatTime(firstEvent.startDate, "en")}.`);
  }

  if (hasMorningBusy) {
    parts.push("The morning is fairly packed.");
  }

  parts.push(hasLunchFree ? "Lunch 11–12 is free." : "Meeting during lunch.");


  if (dayEndsEarly && signals.lastEvent) {
    parts.push(`Done with meetings around ${formatTime(signals.lastEvent.startDate, "en")}.`);
  } else if (dayEndsLate) {
    parts.push("Meetings running past 17:00 today — slightly longer day.");
  }

  // Evening personal activity
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const isPersonal = !isWorkEvent(signals.lastEvent);
    if (isPersonal) {
      parts.push(
        `${eveningActivities[0]} at ${formatTime(signals.lastEvent.startDate, "en")} this evening.`,
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

function buildNorwegian(signals: MorningSignals): MorningBriefSummary {
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
    const freeWeekend = !hasWeekendEvents;
    return {
      available: true,
      isEmpty: true,
      pillText: freeWeekend ? "Åpen dag · fri helg" : "Åpen dag",
      headline: "En åpen dag venter.",
      body: hasWeekendEvents
        ? `Ingenting på programmet i dag. Til helgen: ${weekendSummary}`
        : "Ingenting på programmet. En åpen dag.",
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

  // headline
  let headline: string;
  if (hasMorningBusy && dayEndsLate) {
    headline = "En travel dag venter.";
  } else if (hasMorningBusy) {
    headline = "Travel formiddag i vente.";
  } else if (dayEndsEarly) {
    headline = "Dagen avsluttes tidlig.";
  } else if (eventCount <= 2) {
    headline = "En rolig dag venter.";
  } else {
    headline = "Dagen ser overkommelig ut.";
  }

  // body
  const parts: string[] = [];

  if (firstEvent) {
    parts.push(`Første møte er kl. ${formatTime(firstEvent.startDate, "no")}.`);
  }

  if (hasMorningBusy) {
    parts.push("Formiddagen er ganske full.");
  }

  parts.push(hasLunchFree ? "Lunsj kl. 11–12 er fri." : "Møte i lunsjtiden.");


  if (dayEndsEarly && signals.lastEvent) {
    parts.push(`Ferdig med møter rundt kl. ${formatTime(signals.lastEvent.startDate, "no")}.`);
  } else if (dayEndsLate) {
    parts.push("Møter etter arbeidstid i dag — litt lengre dag.");
  }

  // Evening personal activity
  if (hasEveningActivity && eveningActivities[0] && signals.lastEvent) {
    const isPersonal = !isWorkEvent(signals.lastEvent);
    if (isPersonal) {
      parts.push(
        `${eveningActivities[0]} kl. ${formatTime(signals.lastEvent.startDate, "no")} i kveld.`,
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

export function buildMorningBrief(
  todayEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
): MorningBriefSummary {
  const signals = analyseEvents(todayEvents, weekEvents, locale);
  return locale === "no" ? buildNorwegian(signals) : buildEnglish(signals);
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
