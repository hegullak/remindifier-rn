import { en, type Translations } from "./locales/en";
import { no } from "./locales/no";
import type { Locale } from "./types";

const dictionaries: Record<Locale, Translations> = { en, no };

type Path = string;

function getByPath(obj: Record<string, unknown>, path: Path): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export function translate(
  locale: Locale,
  path: Path,
  params?: Record<string, string | number>,
): string {
  const template = getByPath(dictionaries[locale] as unknown as Record<string, unknown>, path);
  if (!template) {
    if (__DEV__) console.warn(`[i18n] Missing key: ${path}`);
    return path;
  }
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
