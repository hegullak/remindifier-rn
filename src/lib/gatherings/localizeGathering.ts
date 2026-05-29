import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

const DEMO_GATHERING_TITLE_KEYS: Record<string, string> = {
  "g-1": "gathering.demo.g1.title",
};

export function localizeGatheringTitle(
  gatheringId: string,
  title: string,
  locale: Locale,
): string {
  const key = DEMO_GATHERING_TITLE_KEYS[gatheringId];
  return key ? translate(locale, key) : title;
}
