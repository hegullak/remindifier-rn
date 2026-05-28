import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

export type DayPeriod = "morning" | "afternoon" | "evening";

export function dayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function greetingLead(locale: Locale, period: DayPeriod): string {
  const key =
    period === "morning"
      ? "brief.greetingMorning"
      : period === "afternoon"
        ? "brief.greetingAfternoon"
        : "brief.greetingEvening";
  return translate(locale, key);
}

export function briefGreetingLine(firstName: string, locale: Locale, date = new Date()): string {
  const period = dayPeriod(date);
  const name = firstName.trim() || (locale === "no" ? "du" : "there");
  return `${greetingLead(locale, period)},\n${name}.`;
}
