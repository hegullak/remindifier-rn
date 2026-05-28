import { useCallback, useEffect, useState } from "react";
import { listBriefSchedule, listUpcomingRedLetterDays } from "@/db/repos/briefRepo";
import { getBriefSectionOrder, setBriefSectionOrder } from "@/db/repos/userRepo";
import type { BriefSectionId } from "@/lib/brief/sections";
import { DEFAULT_BRIEF_SECTION_ORDER } from "@/lib/brief/sections";
import type { BriefWeatherData } from "@/lib/brief/weather";
import { fetchBriefWeather } from "@/lib/brief/weather";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";

export const HEADSUP_ITEMS = [
  {
    day: "Tue",
    text: "Doctor's appointment · 15:00 at Åsane legesenter",
    strong: "Doctor's appointment",
  },
  { day: "Fri", text: "Dentist · 09:30 · Remember parking", strong: "Dentist" },
] as const;

export const FALLBACK_TRAINING = ["Strength Training: Pull", "Running 4x4 interval"];

interface BriefState {
  weather: BriefWeatherData;
  schedule: { id: string; time: string; title: string; note: string }[];
  redLetterDays: UpcomingRedLetterDay[];
  sectionOrder: BriefSectionId[];
}

const initialState: BriefState = {
  weather: {
    temp: "13°",
    description: "Calm and clear",
    goodForRun: true,
    icon: "⛅",
    details: [],
  },
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

export function formatBriefDateLine(date = new Date()) {
  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return `${dateStr} · Week ${getISOWeek(date)}`;
}

export function useBriefData(userId: string | null | undefined) {
  const [brief, setBrief] = useState<BriefState>(initialState);

  const reload = useCallback(async () => {
    if (!userId) {
      setBrief(initialState);
      return;
    }
    const [schedule, redLetterDays, sectionOrder, weather] = await Promise.all([
      listBriefSchedule(userId),
      listUpcomingRedLetterDays(userId, 90),
      getBriefSectionOrder(userId),
      fetchBriefWeather(),
    ]);
    setBrief((prev) => ({
      ...prev,
      schedule,
      redLetterDays,
      sectionOrder,
      weather,
    }));
  }, [userId]);

  useEffect(() => {
    reload().catch((error) => {
      console.error("failed to load brief", error);
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

  return { brief, reload, setSectionOrder, dateLine: formatBriefDateLine() };
}
