import { redLetterDisplayLabel } from "@/i18n/redLetterKinds";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import { computeAgeFromBirthday } from "@/lib/birthdayForm";
import { weddingAnniversaryName, weddingAnniversaryYears } from "@/lib/milestones/anniversaries";

function parseYmd(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Short date for inline list rows, e.g. «12. sep. 1987». */
export function formatMerkedagShortDate(iso: string, locale: Locale): string {
  return parseYmd(iso).toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Combined «X år Y måneder» since start date. */
export function formatElapsedSinceStart(
  startDate: string,
  asOf: Date = new Date(),
  locale: Locale,
): string | null {
  const start = parseYmd(startDate);
  let years = asOf.getFullYear() - start.getFullYear();
  let months = asOf.getMonth() - start.getMonth();
  if (asOf.getDate() < start.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;

  const yearPart =
    years >= 1
      ? years === 1
        ? translate(locale, "merkedager.elapsed.oneYear")
        : translate(locale, "merkedager.elapsed.years", { count: years })
      : null;
  const monthPart =
    months >= 1
      ? months === 1
        ? translate(locale, "merkedager.elapsed.oneMonth")
        : translate(locale, "merkedager.elapsed.months", { count: months })
      : null;

  if (yearPart && monthPart) {
    const joiner = locale === "no" ? " og " : " and ";
    return `${yearPart}${joiner}${monthPart}`;
  }
  return yearPart ?? monthPart;
}

function formatSinceWithDate(
  locale: Locale,
  key:
    | "people.marriedSince"
    | "people.marriedSinceMilestone"
    | "people.smokeFreeSince"
    | "people.snusFreeSince"
    | "people.sinceElapsed",
  eventDate: string,
  asOf: Date,
  extra?: { milestone?: string },
): string | null {
  const date = formatMerkedagShortDate(eventDate, locale);
  const elapsed = formatElapsedSinceStart(eventDate, asOf, locale);
  if (!elapsed) return null;
  return translate(locale, key, { date, elapsed, ...extra });
}

function formatAnniversaryMiddle(
  eventDate: string,
  label: string | null,
  locale: Locale,
  asOf: Date,
): string | null {
  const years = weddingAnniversaryYears(eventDate, asOf);
  const milestoneName = years ? weddingAnniversaryName(years, locale) : null;
  if (milestoneName) {
    return (
      formatSinceWithDate(locale, "people.marriedSinceMilestone", eventDate, asOf, {
        milestone: milestoneName,
      }) ?? (label?.trim() || null)
    );
  }
  return formatSinceWithDate(locale, "people.marriedSince", eventDate, asOf) ?? (label?.trim() || null);
}

function formatSinceMiddle(
  kind: "Smoke-free" | "Snus-free",
  eventDate: string,
  locale: Locale,
  asOf: Date,
): string | null {
  const key = kind === "Snus-free" ? "people.snusFreeSince" : "people.smokeFreeSince";
  return formatSinceWithDate(locale, key, eventDate, asOf);
}

/** Kinds where middle already embeds the date (gift/røykfri/siden-phrasing). */
const MIDDLE_INCLUDES_DATE_KINDS = new Set([
  "Anniversary",
  "Smoke-free",
  "Snus-free",
  "Other",
]);

/**
 * One-line merkedag label for person detail, e.g.
 * «Bursdag · 38 år · 12. sep. 1987» or «Bryllupsdag · gift siden 1. nov. 2003, 23 år og 7 måneder».
 */
export function formatPersonMerkedagLine(
  kind: string,
  label: string | null,
  eventDate: string,
  yearKnown: boolean,
  locale: Locale,
  asOf: Date = new Date(),
): string {
  const kindLabel = redLetterDisplayLabel(kind, label, locale);
  const datePart = formatMerkedagShortDate(eventDate, locale);

  let middle: string | null = null;
  if (kind === "Birthday") {
    const age = computeAgeFromBirthday(eventDate, yearKnown);
    if (age !== null) {
      middle = translate(locale, "people.years", { count: age });
    }
  } else if (kind === "Anniversary") {
    middle = formatAnniversaryMiddle(eventDate, label, locale, asOf);
  } else if (kind === "Smoke-free") {
    middle = formatSinceMiddle("Smoke-free", eventDate, locale, asOf);
  } else if (kind === "Snus-free") {
    middle = formatSinceMiddle("Snus-free", eventDate, locale, asOf);
  } else if (kind === "Other") {
    middle = formatSinceWithDate(locale, "people.sinceElapsed", eventDate, asOf);
  }

  if (middle) {
    if (MIDDLE_INCLUDES_DATE_KINDS.has(kind)) {
      return `${kindLabel} · ${middle}`;
    }
    return `${kindLabel} · ${middle} · ${datePart}`;
  }
  return `${kindLabel} · ${datePart}`;
}
