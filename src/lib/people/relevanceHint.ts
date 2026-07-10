import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

export type PersonRelevanceData = {
  nextRedLetterDayLabel: string | null;
  nextRedLetterDaysUntil: number | null;
  nextGatheringTitle: string | null;
  nextGatheringDaysUntil: number | null;
  firstFollowUpBody: string | null;
};

/**
 * Builds a short, warm relevance hint for a person card.
 * Returns the most relevant signal: gathering → red-letter day → follow-up.
 */
export function buildPersonRelevanceHint(data: PersonRelevanceData, locale: Locale): string | null {
  // Priority 1: Upcoming gathering within 7 days
  if (
    data.nextGatheringTitle &&
    data.nextGatheringDaysUntil !== null &&
    data.nextGatheringDaysUntil <= 7
  ) {
    const when = formatDaysUntil(data.nextGatheringDaysUntil, locale);
    return `${data.nextGatheringTitle} ${when}`;
  }

  // Priority 2: Red-letter day within 7 days
  if (
    data.nextRedLetterDayLabel &&
    data.nextRedLetterDaysUntil !== null &&
    data.nextRedLetterDaysUntil <= 7
  ) {
    const when = formatDaysUntil(data.nextRedLetterDaysUntil, locale);
    return `${data.nextRedLetterDayLabel} ${when}`;
  }

  // Priority 3: Follow-up note exists
  if (data.firstFollowUpBody) {
    return data.firstFollowUpBody.length > 50
      ? `${data.firstFollowUpBody.slice(0, 47)}...`
      : data.firstFollowUpBody;
  }

  return null;
}

function formatDaysUntil(days: number, locale: Locale): string {
  if (days === 0) return translate(locale, "merkedager.timing.today");
  if (days === 1) return translate(locale, "merkedager.timing.tomorrow");
  return translate(locale, "merkedager.timing.inDays", { count: days });
}
