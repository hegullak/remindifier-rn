import { redLetterDisplayLabel } from "@/i18n/redLetterKinds";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import { nextBirthdayOccurrence } from "@/lib/timeline/birthdays";

const SENTINEL_YEAR = 1;

export interface RedLetterDayRow {
  id: string;
  personId: string | null;
  personName: string;
  kind: string;
  label: string | null;
  eventDate: string;
  yearKnown: boolean;
}

export interface UpcomingRedLetterDay {
  id: string;
  personId: string | null;
  personName: string;
  kind: string;
  eventDate: string;
  displayLabel: string;
  headline: string;
  timing: string;
  daysUntil: number;
  isToday: boolean;
  icon: string;
}

function iconForKind(kind: string): string {
  switch (kind) {
    case "Birthday":
      return "🎂";
    case "Anniversary":
      return "💍";
    case "Smoke-free":
    case "Snus-free":
      return "🏆";
    default:
      return "📌";
  }
}

function whenLabel(daysUntil: number, nextOccurrence: string, locale: Locale): string {
  if (daysUntil === 0) return translate(locale, "merkedager.timing.today");
  if (daysUntil === 1) return translate(locale, "merkedager.timing.tomorrow");
  if (daysUntil <= 6) {
    const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
    return new Date(nextOccurrence).toLocaleDateString(dateLocale, { weekday: "long" });
  }
  if (daysUntil <= 13) {
    return translate(locale, "merkedager.timing.inDays", { count: daysUntil });
  }
  if (daysUntil <= 35) return translate(locale, "merkedager.timing.aboutMonth");
  return translate(locale, "merkedager.timing.comingUp");
}

function parseYmd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function elapsedSinceStart(startDate: string, asOf: Date, locale: Locale): string | null {
  const start = parseYmd(startDate);
  let years = asOf.getFullYear() - start.getFullYear();
  const monthDiff = asOf.getMonth() - start.getMonth();
  const dayDiff = asOf.getDate() - start.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;

  if (years >= 1) {
    return years === 1
      ? translate(locale, "merkedager.elapsed.oneYear")
      : translate(locale, "merkedager.elapsed.years", { count: years });
  }

  let months = (asOf.getFullYear() - start.getFullYear()) * 12 + monthDiff;
  if (dayDiff < 0) months--;
  if (months >= 1) {
    return months === 1
      ? translate(locale, "merkedager.elapsed.oneMonth")
      : translate(locale, "merkedager.elapsed.months", { count: months });
  }

  return null;
}

function anniversaryHeadline(row: RedLetterDayRow, refDate: Date, locale: Locale): string {
  const years = refDate.getFullYear() - parseYmd(row.eventDate).getFullYear();
  const names = row.label?.trim();
  if (years >= 1) {
    if (names) {
      return translate(locale, "merkedager.headline.anniversaryNamedYears", {
        names,
        count: years,
      });
    }
    return translate(locale, "merkedager.headline.anniversaryYears", { count: years });
  }
  if (names) {
    return translate(locale, "merkedager.headline.anniversaryNamed", { names });
  }
  return translate(locale, "merkedager.headline.anniversary");
}

function buildHeadline(
  row: RedLetterDayRow,
  today: Date,
  occ: { daysUntil: number; nextDate: Date },
  locale: Locale,
): string {
  const displayLabel = redLetterDisplayLabel(row.kind, row.label, locale);
  const refDate = occ.daysUntil === 0 ? today : occ.nextDate;

  if (row.kind === "Birthday") {
    const birthYear = Number(row.eventDate.slice(0, 4));
    if (row.yearKnown && birthYear !== SENTINEL_YEAR) {
      const age = refDate.getFullYear() - birthYear;
      return translate(locale, "merkedager.headline.birthdayYears", { count: age });
    }
    return translate(locale, "merkedager.headline.birthday");
  }

  if (row.kind === "Anniversary") {
    return anniversaryHeadline(row, refDate, locale);
  }

  if (row.kind === "Smoke-free" || row.kind === "Snus-free" || row.kind === "Other") {
    const elapsed = elapsedSinceStart(row.eventDate, refDate, locale);
    if (elapsed) {
      return translate(locale, "merkedager.headline.withElapsed", {
        label: displayLabel,
        elapsed,
      });
    }
  }

  return displayLabel;
}

function formatShortDate(iso: string, locale: Locale): string {
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  return parseYmd(iso).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildTiming(
  row: RedLetterDayRow,
  daysUntil: number,
  nextDateIso: string,
  locale: Locale,
): string {
  const base = whenLabel(daysUntil, nextDateIso, locale);
  if (row.kind === "Smoke-free" || row.kind === "Snus-free") {
    const started = formatShortDate(row.eventDate, locale);
    if (daysUntil === 0) {
      return translate(locale, "merkedager.timing.since", { when: base, date: started });
    }
    return translate(locale, "merkedager.timing.started", { when: base, date: started });
  }
  return base;
}

export function upcomingRedLetterDays(
  rows: readonly RedLetterDayRow[],
  today: Date,
  windowDays: number,
  locale: Locale,
): UpcomingRedLetterDay[] {
  const results: UpcomingRedLetterDay[] = [];

  for (const row of rows) {
    const occ = nextBirthdayOccurrence(row.eventDate, new Date(today));
    if (!occ || occ.daysUntil > windowDays) continue;

    const nextDateIso = occ.nextDate.toISOString().slice(0, 10);
    const displayLabel = redLetterDisplayLabel(row.kind, row.label, locale);
    const headline = buildHeadline(row, today, occ, locale);
    const timing = buildTiming(row, occ.daysUntil, nextDateIso, locale);

    results.push({
      id: row.id,
      personId: row.personId,
      personName: row.personName,
      kind: row.kind,
      eventDate: row.eventDate,
      displayLabel,
      headline,
      timing,
      daysUntil: occ.daysUntil,
      isToday: occ.daysUntil === 0,
      icon: iconForKind(row.kind),
    });
  }

  const seen = new Set<string>();
  const deduped = results.filter((item) => {
    const key = `${item.personId ?? item.personName}:${item.kind}:${item.daysUntil}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function legacyBirthdayRow(
  personId: string,
  personName: string,
  birthday: string,
  yearKnown: boolean,
): RedLetterDayRow {
  return {
    id: `legacy-bday-${personId}`,
    personId,
    personName,
    kind: "Birthday",
    label: null,
    eventDate: birthday,
    yearKnown,
  };
}

export function legacyAnniversaryRow(
  personId: string,
  personName: string,
  anniversary: string,
): RedLetterDayRow {
  return {
    id: `legacy-ann-${personId}`,
    personId,
    personName,
    kind: "Anniversary",
    label: null,
    eventDate: anniversary,
    yearKnown: true,
  };
}
