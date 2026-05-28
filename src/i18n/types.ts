export const LOCALES = ["en", "no"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const LOCALE_STORAGE_KEY = "remindifier.locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "no";
}

export { LOCALE_STORAGE_KEY };
