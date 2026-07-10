import type { Locale } from "@/i18n/types";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";

const SCHEDULE_TO_GATHERING: Record<string, string> = {
  s1: "g-1",
};

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9æøå]/gi, "");
}

export function gatheringIdForScheduleItem(scheduleId: string): string | null {
  return SCHEDULE_TO_GATHERING[scheduleId] ?? null;
}

export function gatheringIdForTitle(
  title: string,
  gatherings: { id: string; title: string }[],
  locale: Locale,
): string | null {
  const needle = normalizeTitle(title);
  if (!needle) return null;

  for (const gathering of gatherings) {
    const candidates = [
      gathering.title,
      localizeGatheringTitle(gathering.id, gathering.title, locale),
      localizeGatheringTitle(gathering.id, gathering.title, "en"),
      localizeGatheringTitle(gathering.id, gathering.title, "no"),
    ];
    if (candidates.some((c) => normalizeTitle(c) === needle)) {
      return gathering.id;
    }
  }
  return null;
}

export function enrichScheduleWithGatheringIds<T extends { id: string; title: string }>(
  items: T[],
  gatherings: { id: string; title: string }[],
  locale: Locale,
): (T & { gatheringId: string | null })[] {
  return items.map((item) => ({
    ...item,
    gatheringId:
      gatheringIdForScheduleItem(item.id) ?? gatheringIdForTitle(item.title, gatherings, locale),
  }));
}

export function enrichCalendarWithGatheringIds<T extends { title: string }>(
  items: T[],
  gatherings: { id: string; title: string }[],
  locale: Locale,
): (T & { gatheringId: string | null })[] {
  return items.map((item) => ({
    ...item,
    gatheringId: gatheringIdForTitle(item.title, gatherings, locale),
  }));
}

/** Brief row tap target: existing event or new event prefilled from title. */
export function briefGatheringHref(
  gatheringId: string | null,
  title: string,
): `/gather/${string}` | { pathname: "/gather/new"; params: { prefill: string } } {
  if (gatheringId) return `/gather/${gatheringId}`;
  return { pathname: "/gather/new", params: { prefill: title } };
}
