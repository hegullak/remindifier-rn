import { redLetterDisplayLabel } from "@/lib/red-letter-day";
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

function whenLabel(daysUntil: number, nextOccurrence: string): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil <= 6) {
    return new Date(nextOccurrence).toLocaleDateString("en-GB", { weekday: "long" });
  }
  if (daysUntil <= 13) return `In ${daysUntil} days`;
  if (daysUntil <= 35) return "In about a month";
  return "Coming up";
}

function parseYmd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function elapsedSinceStart(startDate: string, asOf: Date): string | null {
  const start = parseYmd(startDate);
  let years = asOf.getFullYear() - start.getFullYear();
  const monthDiff = asOf.getMonth() - start.getMonth();
  const dayDiff = asOf.getDate() - start.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--;

  if (years >= 1) return years === 1 ? "1 year" : `${years} years`;

  let months = (asOf.getFullYear() - start.getFullYear()) * 12 + monthDiff;
  if (dayDiff < 0) months--;
  if (months >= 1) return months === 1 ? "1 month" : `${months} months`;

  return null;
}

function anniversaryHeadline(eventDate: string, refDate: Date): string {
  const years = refDate.getFullYear() - parseYmd(eventDate).getFullYear();
  if (years >= 1) return `Anniversary · ${years} years`;
  return "Anniversary";
}

function buildHeadline(
  row: RedLetterDayRow,
  today: Date,
  occ: { daysUntil: number; nextDate: Date },
): string {
  const displayLabel = redLetterDisplayLabel(row.kind, row.label);
  const refDate = occ.daysUntil === 0 ? today : occ.nextDate;

  if (row.kind === "Birthday") {
    const birthYear = Number(row.eventDate.slice(0, 4));
    if (row.yearKnown && birthYear !== SENTINEL_YEAR) {
      const age = refDate.getFullYear() - birthYear;
      return `Birthday · ${age} years`;
    }
    return "Birthday";
  }

  if (row.kind === "Anniversary") {
    return anniversaryHeadline(row.eventDate, refDate);
  }

  if (row.kind === "Smoke-free" || row.kind === "Snus-free" || row.kind === "Other") {
    const elapsed = elapsedSinceStart(row.eventDate, refDate);
    if (elapsed) return `${displayLabel} · ${elapsed}`;
  }

  return displayLabel;
}

function buildTiming(row: RedLetterDayRow, daysUntil: number, nextDateIso: string): string {
  const base = whenLabel(daysUntil, nextDateIso);
  if (row.kind === "Smoke-free" || row.kind === "Snus-free") {
    const started = parseYmd(row.eventDate).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (daysUntil === 0) return `${base} · since ${started}`;
    return `${base} · started ${started}`;
  }
  return base;
}

export function upcomingRedLetterDays(
  rows: readonly RedLetterDayRow[],
  today: Date,
  windowDays: number,
): UpcomingRedLetterDay[] {
  const results: UpcomingRedLetterDay[] = [];

  for (const row of rows) {
    const occ = nextBirthdayOccurrence(row.eventDate, new Date(today));
    if (!occ || occ.daysUntil > windowDays) continue;

    const nextDateIso = occ.nextDate.toISOString().slice(0, 10);
    const displayLabel = redLetterDisplayLabel(row.kind, row.label);
    const headline = buildHeadline(row, today, occ);
    const timing = buildTiming(row, occ.daysUntil, nextDateIso);

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
