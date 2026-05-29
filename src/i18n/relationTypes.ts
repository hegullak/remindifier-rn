import { translate } from "./translate";
import type { Locale } from "./types";

/** Known English relation labels from seed / legacy data → i18n path. */
const RELATION_TYPE_KEYS: Record<string, string> = {
  "Close friend": "people.relations.closeFriend",
  "Uncle / Aunt": "people.relations.uncleAunt",
  Sibling: "people.relations.sibling",
  Friend: "people.relations.friend",
  Colleague: "people.relations.colleague",
  Mentor: "people.relations.mentor",
  Cousin: "people.relations.cousin",
  Acquaintance: "people.relations.acquaintance",
  colleagues: "people.relations.colleagues",
};

export function translateRelationType(
  relationType: string | null | undefined,
  locale: Locale,
): string | null {
  if (!relationType?.trim()) return null;
  const trimmed = relationType.trim();
  const key = RELATION_TYPE_KEYS[trimmed];
  return key ? translate(locale, key) : trimmed;
}
