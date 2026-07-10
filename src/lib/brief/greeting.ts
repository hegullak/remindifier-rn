import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

export type DayPeriod = "morning" | "afternoon" | "evening";
export type GreetingParts = { lead: string; name: string };

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

export function briefGreetingLine(
  firstName: string,
  locale: Locale,
  date = new Date(),
): GreetingParts {
  const period = dayPeriod(date);
  const name = firstName.trim() || (locale === "no" ? "du" : "there");
  return { lead: `${greetingLead(locale, period)},`, name: `${name}.` };
}
