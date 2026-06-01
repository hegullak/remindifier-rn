import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import { weddingAnniversaryYears } from "@/lib/milestones/anniversaries";

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

/** Day + month only, e.g. «1. nov.» — used for anniversaries (year is implied by the count). */
export function formatMerkedagDayMonth(iso: string, locale: Locale): string {
  return parseYmd(iso).toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", {
    day: "numeric",
    month: "short",
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

/**
 * One-line merkedag text for person detail. The kind is conveyed by the icon
 * shown beside it, so no kind word is prepended. Per-kind formats:
 * - Birthday:   «12. sep. 1987»
 * - Anniversary:«1. nov. · 22 år»  (day+month, then years married — no months)
 * - Smoke/Snus: «17 år og 7 måneder · siden 1. nov. 2008»
 * - Other:      «{label} · siden {date}»
 */
export function formatPersonMerkedagLine(
  kind: string,
  label: string | null,
  eventDate: string,
  _yearKnown: boolean,
  locale: Locale,
  asOf: Date = new Date(),
): string {
  if (kind === "Birthday") {
    return formatMerkedagShortDate(eventDate, locale);
  }

  if (kind === "Anniversary") {
    const dayMonth = formatMerkedagDayMonth(eventDate, locale);
    const years = weddingAnniversaryYears(eventDate, asOf);
    if (years && years >= 1) {
      return `${dayMonth} · ${translate(locale, "people.years", { count: years })}`;
    }
    return dayMonth;
  }

  // Smoke-free / Snus-free / Other → elapsed first, then "siden {date}"
  const elapsed = formatElapsedSinceStart(eventDate, asOf, locale);
  const since = translate(locale, "people.sinceDate", {
    date: formatMerkedagShortDate(eventDate, locale),
  });
  const tail = elapsed ? `${elapsed} · ${since}` : since;
  if (kind === "Other" && label?.trim()) {
    return `${label.trim()} · ${tail}`;
  }
  return tail;
}
