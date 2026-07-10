import { translate } from "./translate";
import type { Locale } from "./types";

/** Stored in DB as comma-separated canonical English values, e.g. `Parent,Close friend`. */
export const RELATION_TYPE_STORAGE_SEPARATOR = ",";

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

function translateSingleRelation(value: string, locale: Locale): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const key = RELATION_TYPE_KEYS[trimmed];
  return key ? translate(locale, key) : trimmed;
}

/** Parse stored relation_type (single value or comma-separated canonical values). */
export function parseRelationTypes(relationType: string | null | undefined): string[] {
  if (!relationType?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of relationType.split(RELATION_TYPE_STORAGE_SEPARATOR)) {
    const trimmed = part.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Canonical comma-separated storage string, stable chip order. */
export function serializeRelationTypes(values: readonly string[]): string | null {
  const set = new Set(values.map((v) => v.trim()).filter(Boolean));
  if (set.size === 0) return null;
  const ordered = RELATION_CATEGORIES.map((c) => c.value).filter((v) => set.has(v));
  for (const v of set) {
    if (!ordered.includes(v)) ordered.push(v);
  }
  return ordered.join(RELATION_TYPE_STORAGE_SEPARATOR);
}

export function translateRelationType(
  relationType: string | null | undefined,
  locale: Locale,
): string | null {
  const parts = parseRelationTypes(relationType);
  if (parts.length === 0) return null;

  const translated = parts.map((p) => translateSingleRelation(p, locale)).filter(Boolean);
  if (translated.length === 0) return null;

  const conjunction = locale === "no" ? " og " : " and ";
  return translated.join(conjunction);
}

export function toggleRelationCategory(stored: readonly string[], categoryValue: string): string[] {
  const set = new Set(stored);
  if (set.has(categoryValue)) {
    set.delete(categoryValue);
  } else {
    set.add(categoryValue);
  }
  return RELATION_CATEGORIES.map((c) => c.value).filter((v) => set.has(v));
}
