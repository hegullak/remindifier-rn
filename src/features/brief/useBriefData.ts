import { useCallback, useEffect, useState } from "react";
import { listBriefSchedule, listUpcomingRedLetterDays } from "@/db/repos/briefRepo";
import { getBriefSectionOrder, setBriefSectionOrder } from "@/db/repos/userRepo";
import type { BriefSectionId } from "@/lib/brief/sections";
import { DEFAULT_BRIEF_SECTION_ORDER } from "@/lib/brief/sections";
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
  firstName: string;
  weather: { temp: string; description: string };
  schedule: { id: string; time: string; title: string; note: string }[];
  redLetterDays: UpcomingRedLetterDay[];
  sectionOrder: BriefSectionId[];
}

const initialState: BriefState = {
  firstName: "there",
  weather: { temp: "13°C", description: "Calm and clear" },
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
    const [schedule, redLetterDays, sectionOrder] = await Promise.all([
      listBriefSchedule(userId),
      listUpcomingRedLetterDays(userId, 90),
      getBriefSectionOrder(userId),
    ]);
    setBrief((prev) => ({
      ...prev,
      firstName: "Helga",
      schedule,
      redLetterDays,
      sectionOrder,
    }));
  }, [userId]);

  useEffect(() => {
    reload().catch((error) => {
      console.error("failed to load brief", error);
    });
  }, [reload]);

  const moveSection = async (sectionId: BriefSectionId, direction: "up" | "down") => {
    if (!userId) return;
    const order = [...brief.sectionOrder];
    const index = order.indexOf(sectionId);
    if (index < 0) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= order.length) return;
    [order[index], order[swapWith]] = [order[swapWith], order[index]];
    setBrief((prev) => ({ ...prev, sectionOrder: order }));
    await setBriefSectionOrder(userId, order);
  };

  return { brief, reload, moveSection, dateLine: formatBriefDateLine() };
}
