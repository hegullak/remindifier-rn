import { redLetterDisplayLabel } from "@/i18n/redLetterKinds";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
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

  if (yearPart && monthPart) return `${yearPart} ${monthPart}`;
  return yearPart ?? monthPart;
}

function formatAnniversaryMiddle(
  eventDate: string,
  label: string | null,
  locale: Locale,
  asOf: Date,
): string | null {
  const years = weddingAnniversaryYears(eventDate, asOf);
  if (!years || years <= 0) {
    return label?.trim() || null;
  }
  const milestoneName = weddingAnniversaryName(years, locale);
  const yearsLabel = translate(locale, "merkedager.headline.anniversaryYears", { count: years });
  if (milestoneName) return `${yearsLabel} — ${milestoneName}`;
  return yearsLabel;
}

/**
 * One-line merkedag label for person detail, e.g.
 * «Bursdag · 12. sep. 1987» or «Røykfri · 17 år 3 måneder · 1. nov. 2008».
 */
export function formatPersonMerkedagLine(
  kind: string,
  label: string | null,
  eventDate: string,
  locale: Locale,
  asOf: Date = new Date(),
): string {
  const kindLabel = redLetterDisplayLabel(kind, label, locale);
  const datePart = formatMerkedagShortDate(eventDate, locale);

  let middle: string | null = null;
  if (kind === "Anniversary") {
    middle = formatAnniversaryMiddle(eventDate, label, locale, asOf);
  } else if (kind === "Smoke-free" || kind === "Snus-free") {
    middle = formatElapsedSinceStart(eventDate, asOf, locale);
  } else if (kind === "Other") {
    middle = formatElapsedSinceStart(eventDate, asOf, locale);
  }

  if (middle) return `${kindLabel} · ${middle} · ${datePart}`;
  return `${kindLabel} · ${datePart}`;
}
