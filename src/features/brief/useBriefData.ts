import { useCallback, useEffect, useMemo, useState } from "react";
import { getCalendarWeekBounds, formatCalendarWeekRange, getISOWeek } from "@/lib/brief/calendarWeek";
import { listBriefSchedule, listUpcomingRedLetterDays } from "@/db/repos/briefRepo";
import { listGatheringsForUser } from "@/db/repos/gatheringsRepo";
import { getBriefSectionOrder, setBriefSectionOrder } from "@/db/repos/userRepo";
import {
  getFallbackTraining,
  getHeadsupItems,
  localizeScheduleItem,
} from "@/features/brief/briefContent";
import { useTranslation } from "@/i18n/LanguageContext";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import {
  type CalendarBriefEvent,
  fetchCalendarBriefEvents,
  startOfToday,
} from "@/lib/brief/calendarEvents";
import {
  enrichCalendarWithGatheringIds,
  enrichScheduleWithGatheringIds,
} from "@/lib/gatherings/briefLinks";
import type { BriefSectionId } from "@/lib/brief/sections";
import { DEFAULT_BRIEF_SECTION_ORDER } from "@/lib/brief/sections";
import { subscribeBriefReload } from "@/lib/brief/briefRefresh";
import { logger } from "@/lib/logger";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";

interface BriefState {
  schedule: {
    id: string;
    time: string;
    title: string;
    note: string;
    gatheringId: string | null;
  }[];
  calendarEvents: (CalendarBriefEvent & { gatheringId: string | null })[];
  todayEvents: CalendarBriefEvent[];
  tomorrowEvents: CalendarBriefEvent[];
  weekEvents: CalendarBriefEvent[];
  redLetterDays: UpcomingRedLetterDay[];
  sectionOrder: BriefSectionId[];
}

const initialState: BriefState = {
  schedule: [],
  calendarEvents: [],
  todayEvents: [],
  tomorrowEvents: [],
  weekEvents: [],
  redLetterDays: [],
  sectionOrder: DEFAULT_BRIEF_SECTION_ORDER,
};

export function formatBriefDateLine(locale: Locale, weekBounds: { start: Date; end: Date }) {
  const week = getISOWeek(weekBounds.start);
  const range = formatCalendarWeekRange(weekBounds, locale);
  return `${range} · ${translate(locale, "brief.dateWeek", { week })}`;
}

export function useBriefData(userId: string | null | undefined) {
  const { locale } = useTranslation();
  const [brief, setBrief] = useState<BriefState>(initialState);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekBounds = useMemo(() => getCalendarWeekBounds(new Date(), weekOffset), [weekOffset]);

  const headsupItems = useMemo(() => getHeadsupItems(locale), [locale]);
  const trainingLines = useMemo(() => getFallbackTraining(locale), [locale]);

  const reload = useCallback(async () => {
    if (!userId) {
      setBrief(initialState);
      return;
    }
    const [scheduleRaw, redLetterDays, sectionOrder, calendarEvents, gatherings] =
      await Promise.all([
      listBriefSchedule(userId),
      listUpcomingRedLetterDays(userId, 60, locale),
      getBriefSectionOrder(userId),
      fetchCalendarBriefEvents(weekBounds),
      listGatheringsForUser(userId),
    ]);
    const scheduleLocalized = scheduleRaw.map((item) => localizeScheduleItem(item, locale));
    const schedule = enrichScheduleWithGatheringIds(scheduleLocalized, gatherings, locale);
    const calendarLinked = enrichCalendarWithGatheringIds(calendarEvents, gatherings, locale);

    const todayStart = startOfToday();
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const todayEvents = calendarEvents.filter(
      (e) => e.startDate >= todayStart && e.startDate <= todayEnd,
    );
    const tomorrowEvents = calendarEvents.filter(
      (e) => e.startDate >= tomorrowStart && e.startDate < tomorrowEnd,
    );

    setBrief((prev) => ({
      ...prev,
      schedule,
      calendarEvents: calendarLinked,
      todayEvents,
      tomorrowEvents,
      weekEvents: calendarEvents,
      redLetterDays,
      sectionOrder,
    }));
  }, [userId, locale, weekBounds]);

  useEffect(() => {
    reload().catch((error) => {
      logger.error("brief_load_failed", { error: error instanceof Error ? error.name : "unknown" });
    });
  }, [reload]);

  useEffect(() => subscribeBriefReload(() => void reload()), [reload]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekOffset((prev) => prev + delta);
  }, []);

  const resetWeek = useCallback(() => {
    setWeekOffset(0);
  }, []);

  const setSectionOrder = useCallback(
    async (order: BriefSectionId[]) => {
      setBrief((prev) => ({ ...prev, sectionOrder: order }));
      if (userId) {
        await setBriefSectionOrder(userId, order);
      }
    },
    [userId],
  );

  return {
    brief,
    reload,
    setSectionOrder,
    weekOffset,
    weekBounds,
    shiftWeek,
    resetWeek,
    dateLine: formatBriefDateLine(locale, weekBounds),
    headsupItems,
    trainingLines,
  };
}
