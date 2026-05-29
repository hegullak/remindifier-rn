import { useCallback, useEffect, useMemo, useState } from "react";
import { listBriefSchedule, listUpcomingRedLetterDays } from "@/db/repos/briefRepo";
import { getBriefSectionOrder, setBriefSectionOrder } from "@/db/repos/userRepo";
import {
  getFallbackTraining,
  getHeadsupItems,
  localizeScheduleItem,
} from "@/features/brief/briefContent";
import { useTranslation } from "@/i18n/LanguageContext";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";
import type { BriefSectionId } from "@/lib/brief/sections";
import { DEFAULT_BRIEF_SECTION_ORDER } from "@/lib/brief/sections";
import type { BriefWeatherData } from "@/lib/brief/weather";
import { fetchBriefWeather } from "@/lib/brief/weather";
import { logger } from "@/lib/logger";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";

interface BriefState {
  weather: BriefWeatherData;
  schedule: { id: string; time: string; title: string; note: string }[];
  redLetterDays: UpcomingRedLetterDay[];
  sectionOrder: BriefSectionId[];
}

const initialWeather: BriefWeatherData = {
  temp: "13°",
  description: "…",
  goodForRun: true,
  icon: "⛅",
  locationLabel: "",
  details: [],
};

const initialState: BriefState = {
  weather: initialWeather,
  schedule: [],
  redLetterDays: [],
  sectionOrder: DEFAULT_BRIEF_SECTION_ORDER,
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatBriefDateLine(locale: Locale, date = new Date()) {
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const dateStr = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const week = getISOWeek(date);
  return `${dateStr} · ${translate(locale, "brief.dateWeek", { week })}`;
}

export function useBriefData(userId: string | null | undefined) {
  const { locale } = useTranslation();
  const [brief, setBrief] = useState<BriefState>(initialState);

  const headsupItems = useMemo(() => getHeadsupItems(locale), [locale]);
  const trainingLines = useMemo(() => getFallbackTraining(locale), [locale]);

  const reload = useCallback(async () => {
    if (!userId) {
      setBrief(initialState);
      return;
    }
    const [scheduleRaw, redLetterDays, sectionOrder, weather] = await Promise.all([
      listBriefSchedule(userId),
      listUpcomingRedLetterDays(userId, 90, locale),
      getBriefSectionOrder(userId),
      fetchBriefWeather(locale),
    ]);
    const schedule = scheduleRaw.map((item) => localizeScheduleItem(item, locale));
    setBrief((prev) => ({
      ...prev,
      schedule,
      redLetterDays,
      sectionOrder,
      weather,
    }));
  }, [userId, locale]);

  useEffect(() => {
    reload().catch((error) => {
      logger.error("brief_load_failed", { error: error instanceof Error ? error.name : "unknown" });
    });
  }, [reload]);

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
    dateLine: formatBriefDateLine(locale),
    headsupItems,
    trainingLines,
  };
}
