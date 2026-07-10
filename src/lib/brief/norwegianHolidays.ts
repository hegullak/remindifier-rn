/**
 * Norwegian public holidays + long-weekend detection.
 * All date calculations are pure (no side effects).
 */

export type NorwegianHoliday = {
  date: Date;
  name: string;
  nameNo: string;
};

/** Easter Sunday (Gregorian) via Anonymous Gregorian algorithm */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function midnight(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getNorwegianHolidays(year: number): NorwegianHoliday[] {
  const easter = easterSunday(year);
  return [
    { date: midnight(new Date(year, 0, 1)), name: "New Year's Day", nameNo: "Nyttårsdag" },
    { date: midnight(addDays(easter, -3)), name: "Maundy Thursday", nameNo: "Skjærtorsdag" },
    { date: midnight(addDays(easter, -2)), name: "Good Friday", nameNo: "Langfredag" },
    { date: midnight(easter), name: "Easter Sunday", nameNo: "1. påskedag" },
    { date: midnight(addDays(easter, 1)), name: "Easter Monday", nameNo: "2. påskedag" },
    { date: midnight(new Date(year, 4, 1)), name: "Labour Day", nameNo: "1. mai" },
    { date: midnight(new Date(year, 4, 17)), name: "Constitution Day", nameNo: "17. mai" },
    { date: midnight(addDays(easter, 39)), name: "Ascension Day", nameNo: "Kristi himmelfartsdag" },
    { date: midnight(addDays(easter, 49)), name: "Whit Sunday", nameNo: "1. pinsedag" },
    { date: midnight(addDays(easter, 50)), name: "Whit Monday", nameNo: "2. pinsedag" },
    { date: midnight(new Date(year, 11, 25)), name: "Christmas Day", nameNo: "1. juledag" },
    { date: midnight(new Date(year, 11, 26)), name: "Boxing Day", nameNo: "2. juledag" },
  ];
}

export type UpcomingHolidayInfo = {
  holiday: NorwegianHoliday;
  daysUntil: number;
  /** Suggestion to take a bridging day off (klemmdag) */
  bridgeDaySuggestion?: string;
};

/**
 * Returns the next holiday within `windowDays` days (default 21).
 * Also calculates whether taking a bridge day creates a long weekend.
 */
export function getUpcomingHoliday(
  today: Date,
  locale: "en" | "no",
  windowDays = 21,
): UpcomingHolidayInfo | null {
  const todayMs = midnight(today).getTime();
  const windowEnd = todayMs + windowDays * 86400000;

  const year = today.getFullYear();
  const holidays = [...getNorwegianHolidays(year), ...getNorwegianHolidays(year + 1)];

  const upcoming = holidays
    .filter((h) => h.date.getTime() >= todayMs && h.date.getTime() <= windowEnd)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (upcoming.length === 0) return null;

  const h = upcoming[0];
  const daysUntil = Math.round((h.date.getTime() - todayMs) / 86400000);
  const dow = h.date.getDay(); // 0=Sun,1=Mon,...,6=Sat

  // Bridge day (klemmdag) suggestions
  let bridgeDaySuggestion: string | undefined;
  if (locale === "no") {
    if (dow === 2) {
      // Tuesday holiday → take Monday off for 4-day weekend
      bridgeDaySuggestion = `${h.nameNo} faller på tirsdag — ta mandag fri og få en 4-dagers helg!`;
    } else if (dow === 4) {
      // Thursday holiday → take Friday off for 4-day weekend
      bridgeDaySuggestion = `${h.nameNo} er torsdag — ta fredag fri og strekk helgen til fire dager!`;
    }
  } else {
    if (dow === 2) {
      bridgeDaySuggestion = `${h.name} falls on Tuesday — take Monday off for a 4-day weekend!`;
    } else if (dow === 4) {
      bridgeDaySuggestion = `${h.name} is on Thursday — take Friday off for a long 4-day weekend!`;
    }
  }

  return { holiday: h, daysUntil, bridgeDaySuggestion };
}

/** Format holiday proximity text */
export function formatHolidayLine(info: UpcomingHolidayInfo, locale: "en" | "no"): string {
  const { holiday, daysUntil } = info;
  if (locale === "no") {
    if (daysUntil === 0) return `I dag er det ${holiday.nameNo} 🎉`;
    if (daysUntil === 1) return `${holiday.nameNo} i morgen!`;
    if (daysUntil <= 3) return `${holiday.nameNo} om ${daysUntil} dager.`;
    if (daysUntil <= 7) return `${holiday.nameNo} om ${daysUntil} dager.`;
    return `${holiday.nameNo} om ${daysUntil} dager.`;
  } else {
    if (daysUntil === 0) return `Today is ${holiday.name} 🎉`;
    if (daysUntil === 1) return `${holiday.name} tomorrow!`;
    return `${holiday.name} in ${daysUntil} days.`;
  }
}
