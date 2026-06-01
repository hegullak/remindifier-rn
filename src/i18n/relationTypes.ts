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
  Partner: "people.relations.partner",
  Parent: "people.relations.parent",
  Child: "people.relations.child",
  "Friend of friend": "people.relations.friendOfFriend",
};

/** Preset relation categories shown as chips on the person form. */
export const RELATION_CATEGORIES: { value: string; key: string }[] = [
  { value: "Partner", key: "people.relations.partner" },
  { value: "Parent", key: "people.relations.parent" },
  { value: "Child", key: "people.relations.child" },
  { value: "Sibling", key: "people.relations.sibling" },
  { value: "Close friend", key: "people.relations.closeFriend" },
  { value: "Friend", key: "people.relations.friend" },
  { value: "Friend of friend", key: "people.relations.friendOfFriend" },
  { value: "Colleague", key: "people.relations.colleague" },
];

export function translateRelationType(
  relationType: string | null | undefined,
  locale: Locale,
): string | null {
  if (!relationType?.trim()) return null;
  const trimmed = relationType.trim();
  const key = RELATION_TYPE_KEYS[trimmed];
  return key ? translate(locale, key) : trimmed;
}
