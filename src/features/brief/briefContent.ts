import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

export interface HeadsupItem {
  day: string;
  text: string;
}

export function getHeadsupItems(locale: Locale): HeadsupItem[] {
  return [
    {
      day: translate(locale, "brief.headsup.days.tue"),
      text: translate(locale, "brief.headsup.items.doctor"),
    },
    {
      day: translate(locale, "brief.headsup.days.fri"),
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
