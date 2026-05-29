import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

export interface HeadsupItem {
  day: string;
  text: string;
}

/** Next occurrence of weekday (0=Sun … 6=Sat), label in long form; NO uses uppercase. */
function nextWeekdayLabel(weekday: number, locale: Locale): string {
  const now = new Date();
  const current = now.getDay();
  let daysAhead = weekday - current;
  if (daysAhead <= 0) daysAhead += 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysAhead);
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const label = target.toLocaleDateString(dateLocale, { weekday: "long" });
  if (locale === "no") return label.toUpperCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getHeadsupItems(locale: Locale): HeadsupItem[] {
  return [
    {
      day: nextWeekdayLabel(2, locale),
      text: translate(locale, "brief.headsup.items.doctor"),
    },
    {
      day: nextWeekdayLabel(5, locale),
      text: translate(locale, "brief.headsup.items.dentist"),
    },
  ];
}

export function getFallbackTraining(locale: Locale): string[] {
  return [translate(locale, "brief.training.pull"), translate(locale, "brief.training.intervals")];
}

const DEMO_SCHEDULE_I18N: Record<string, { title: string; note: string }> = {
  s1: { title: "brief.demo.schedule.s1.title", note: "brief.demo.schedule.s1.note" },
};

export function localizeScheduleItem(
  item: { id: string; time: string; title: string; note: string },
  locale: Locale,
): { id: string; time: string; title: string; note: string } {
  const keys = DEMO_SCHEDULE_I18N[item.id];
  if (!keys) return item;
  return {
    ...item,
    title: translate(locale, keys.title),
    note: translate(locale, keys.note),
  };
}
