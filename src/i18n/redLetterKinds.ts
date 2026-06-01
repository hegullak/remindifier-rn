import { translate } from "./translate";
import type { Locale } from "./types";

const KIND_PATH: Record<string, string> = {
  Birthday: "merkedager.kinds.birthday",
  Anniversary: "merkedager.kinds.anniversary",
  "Smoke-free": "merkedager.kinds.smokeFree",
  "Snus-free": "merkedager.kinds.snusFree",
  Other: "merkedager.kinds.other",
};

const KIND_ICON: Record<string, string> = {
  Birthday: "🎂",
  Anniversary: "💍",
  "Smoke-free": "🚭",
  "Snus-free": "🟤",
  Other: "⭐",
};

export function redLetterKindIcon(kind: string): string {
  return KIND_ICON[kind] ?? "⭐";
}

export function redLetterKindLabel(kind: string, locale: Locale): string {
  const path = KIND_PATH[kind];
  return path ? translate(locale, path) : kind;
}

export function redLetterDisplayLabel(kind: string, label: string | null, locale: Locale): string {
  if (kind === "Other" && label?.trim()) return label.trim();
  if (label?.trim()) return label.trim();
  return redLetterKindLabel(kind, locale);
}
