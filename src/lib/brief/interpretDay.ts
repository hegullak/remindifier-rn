import { analyzeDay, type DaySignals } from "@/lib/brief/analyzeDay";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { classifyDayLoad, type DayLoad } from "@/lib/brief/dayLoad";
import { eventIcon } from "@/lib/brief/eventIcon";

/**
 * Turns day signals into calm, interpreted copy — the heart of Briefs.
 * "Kalenderen viser tid. echoflow forklarer dagen." Keep the tone warm and
 * practical: a quiet day-interpreter, not a productivity coach.
 */

export type BriefPeriod = "morning" | "evening";

export type ImportantItem = {
  id: string;
  icon: string;
  /** "13:00", or "" for all-day. */
  time: string;
  title: string;
  /** Optional practical nudge, e.g. transport or prep. */
  hint?: string;
  /** Weekday label for "later this week" items. */
  dayLabel?: string;
};

export type BriefInterpretation = {
  period: BriefPeriod;
  load: DayLoad;
  loadLabel: string;
  loadReason: string;
  rhythm: string;
  breathingRoom: string;
  importantToday: ImportantItem[];
  laterThisWeek: ImportantItem[];
  recommendation: string;
};

type Copy = {
  loadLabel: Record<DayLoad, string>;
  loadReason: Record<"empty" | DayLoad, string>;
  rhythmMorningHeavy: string;
  rhythmAfternoonHeavy: string;
  rhythmEven: string;
  rhythmEmpty: string;
  breathingLunch: string;
  breathingWindow: (from: string) => string;
  breathingTight: string;
  breathingOpen: string;
  recBusy: string;
  recModerate: string;
  recLight: string;
  laterPrefix: string;
  tomorrowLoadReason: Record<DayLoad, string>;
  eveningRhythm: (first: string | null) => string;
  eveningRec: string;
  weekdays: readonly string[];
};

const COPY = {
  no: {
    loadLabel: { light: "Lett dag", moderate: "Moderat dag", busy: "Hektisk dag" },
    loadReason: {
      empty: "Ingen avtaler i kalenderen i dag.",
      light: "Få avtaler og god plass mellom dem.",
      moderate: "En håndterbar dag med litt struktur.",
      busy: "Tett program — verdt å beskytte pausene.",
    },
    rhythmMorningHeavy: "Formiddagen har mest trykk, men ettermiddagen åpner seg litt.",
    rhythmAfternoonHeavy: "Dagen starter rolig, men tetner til etter lunsj.",
    rhythmEven: "Dette ser ut som en jevn dag uten store topper.",
    rhythmEmpty: "Dagen er åpen — du styrer tempoet selv.",
    breathingLunch: "Lunsjen er ledig. Bruk den til mat og luft, ikke som ekstra arbeidsflate.",
    breathingWindow: (from: string) =>
      `Du har et godt vindu etter ${from}. Fint tidspunkt for en rolig oppgave.`,
    breathingTight: "Det er lite luft mellom avtalene. Hold overganger enkle.",
    breathingOpen: "God plass i dagen. Ta pausene du trenger.",
    recBusy: "Ikke press inn mer i dag. Dagen er passe full allerede.",
    recModerate: "Bruk lunsjen som pusterom hvis du kan. Det er dagens beste investering.",
    recLight: "Dagen har rom. Bruk litt av den på noe som gir energi.",
    laterPrefix: "",
    tomorrowLoadReason: {
      light: "I morgen ser ganske lett ut.",
      moderate: "I morgen ser overkommelig ut.",
      busy: "I morgen blir en full dag.",
    },
    eveningRhythm: (first: string | null) =>
      first
        ? `Første avtale er kl. ${first}. Legg klart det du trenger, så slipper du småkaos i morgen tidlig.`
        : "Ingen faste avtaler i morgen. Kvelden kan lande rolig.",
    eveningRec: "Resten av uken trenger du ikke tenke på nå. Hold kvelden lett.",
    weekdays: ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"],
  },
  en: {
    loadLabel: { light: "Light day", moderate: "Moderate day", busy: "Busy day" },
    loadReason: {
      empty: "Nothing on the calendar today.",
      light: "Few events with room between them.",
      moderate: "A manageable day with some structure.",
      busy: "A packed day — worth protecting your breaks.",
    },
    rhythmMorningHeavy: "The morning carries the most pressure, but the afternoon opens up.",
    rhythmAfternoonHeavy: "The day starts calm, then tightens up after lunch.",
    rhythmEven: "This looks like an even day without big peaks.",
    rhythmEmpty: "The day is open — you set the pace.",
    breathingLunch: "Lunch is free. Use it for food and air, not as extra work surface.",
    breathingWindow: (from: string) =>
      `You have a good window after ${from}. A fine time for a calm task.`,
    breathingTight: "There's little air between events. Keep the transitions simple.",
    breathingOpen: "Plenty of room in the day. Take the breaks you need.",
    recBusy: "Don't squeeze in more today. The day is full enough already.",
    recModerate: "Use lunch as breathing room if you can. It's today's best investment.",
    recLight: "The day has room. Spend some of it on something that gives energy.",
    laterPrefix: "",
    tomorrowLoadReason: {
      light: "Tomorrow looks fairly light.",
      moderate: "Tomorrow looks manageable.",
      busy: "Tomorrow will be a full day.",
    },
    eveningRhythm: (first: string | null) =>
      first
        ? `Your first event is at ${first}. Lay out what you need so the morning stays calm.`
        : "No fixed events tomorrow. The evening can land quietly.",
    eveningRec: "You don't need to think about the rest of the week now. Keep the evening light.",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
} as const;

function minutesToLabel(minutes: number, locale: "en" | "no"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventTimeLabel(event: CalendarBriefEvent, locale: "en" | "no"): string {
  if (event.allDay) return "";
  return event.startDate.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Practical prep nudge keyed off the title. Kept short and specific. */
function hintForTitle(title: string, locale: "en" | "no"): string | undefined {
  const lower = title.toLowerCase();
  if (/(fysio|lege|tannlege|physio|doctor|dentist)/.test(lower)) {
    return locale === "no"
      ? "Ta høyde for transport og litt lavere tempo etterpå."
      : "Allow for transport and a slightly slower pace afterwards.";
  }
  if (/(fotball|kamp|trening|football|training|match)/.test(lower)) {
    return locale === "no"
      ? "Ikke legg middagen for tett opp mot avreise."
      : "Don't schedule dinner too close to leaving.";
  }
  if (/(fly|reise|flight|travel)/.test(lower)) {
    return locale === "no"
      ? "Ikke la pakkingen bli et kveldsprosjekt."
      : "Don't let packing become an evening project.";
  }
  return undefined;
}

function toImportantItem(
  event: CalendarBriefEvent,
  locale: "en" | "no",
  dayLabel?: string,
): ImportantItem {
  return {
    id: event.id,
    icon: eventIcon(event.title),
    time: eventTimeLabel(event, locale),
    title: event.title,
    hint: hintForTitle(event.title, locale),
    dayLabel,
  };
}

function buildRhythm(signals: DaySignals, c: Copy): string {
  if (signals.timedEventCount === 0) return c.rhythmEmpty;
  const { morningLoad, afternoonLoad, eveningLoad } = signals;
  if (morningLoad > afternoonLoad + eveningLoad) return c.rhythmMorningHeavy;
  if (afternoonLoad + eveningLoad > morningLoad) return c.rhythmAfternoonHeavy;
  return c.rhythmEven;
}

function buildBreathingRoom(signals: DaySignals, locale: "en" | "no", c: Copy): string {
  if (signals.timedEventCount === 0) return c.breathingOpen;
  if (signals.lunchFree && signals.timedEventCount >= 2) return c.breathingLunch;
  const afternoonGap = signals.gaps
    .filter((g) => g.startMinutes >= 13 * 60)
    .sort((a, b) => b.durationMinutes - a.durationMinutes)[0];
  if (afternoonGap) return c.breathingWindow(minutesToLabel(afternoonGap.startMinutes, locale));
  if (signals.hasBackToBack) return c.breathingTight;
  return c.breathingOpen;
}

function buildRecommendation(load: DayLoad, c: Copy): string {
  if (load === "busy") return c.recBusy;
  if (load === "moderate") return c.recModerate;
  return c.recLight;
}

/** Non-work events later in the week worth knowing about now (daysUntil >= 2). */
function buildLaterThisWeek(
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  c: Copy,
): ImportantItem[] {
  return weekEvents
    .filter((e) => !e.allDay && e.daysUntil >= 2)
    .filter((e) => Boolean(hintForTitle(e.title, locale)) || eventIcon(e.title) !== "🕐")
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 3)
    .map((e) => {
      const weekday = c.weekdays[e.startDate.getDay()];
      const label = locale === "no" ? weekday : weekday;
      return toImportantItem(e, locale, label.charAt(0).toUpperCase() + label.slice(1));
    });
}

export function interpretDay(
  todayEvents: CalendarBriefEvent[],
  weekEvents: CalendarBriefEvent[],
  locale: "en" | "no",
  period: BriefPeriod = "morning",
): BriefInterpretation {
  const c = COPY[locale];
  const focusEvents = todayEvents;
  const signals = analyzeDay(focusEvents);
  const { load, reasons } = classifyDayLoad(signals);

  const importantToday = signals.specialEvents.map((e) => toImportantItem(e, locale));
  const laterThisWeek = buildLaterThisWeek(weekEvents, locale, c);

  if (period === "evening") {
    const first = signals.firstEvent ? eventTimeLabel(signals.firstEvent, locale) : null;
    return {
      period,
      load,
      loadLabel: c.loadLabel[load],
      loadReason: c.tomorrowLoadReason[load],
      rhythm: c.eveningRhythm(first),
      breathingRoom: buildBreathingRoom(signals, locale, c),
      importantToday,
      laterThisWeek,
      recommendation: c.eveningRec,
    };
  }

  const loadReason = reasons.includes("empty") ? c.loadReason.empty : c.loadReason[load];

  return {
    period,
    load,
    loadLabel: c.loadLabel[load],
    loadReason,
    rhythm: buildRhythm(signals, c),
    breathingRoom: buildBreathingRoom(signals, locale, c),
    importantToday,
    laterThisWeek,
    recommendation: buildRecommendation(load, c),
  };
}
