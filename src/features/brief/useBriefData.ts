import { useEffect, useState } from "react";
import { listBriefRedLetterDays, listBriefSchedule } from "@/db/repos/briefRepo";

interface BriefState {
  firstName: string;
  weather: {
    temp: string;
    description: string;
  };
  schedule: { id: string; time: string; title: string; note: string }[];
  redLetterDays: { id: string; personName: string; headline: string; timing: string }[];
}

const initialState: BriefState = {
  firstName: "there",
  weather: {
    temp: "13°C",
    description: "Calm and clear",
  },
  schedule: [],
  redLetterDays: [],
};

export function useBriefData(userId: string | null | undefined) {
  const [brief, setBrief] = useState<BriefState>(initialState);

  useEffect(() => {
    if (!userId) {
      setBrief(initialState);
      return;
    }
    const activeUserId = userId;

    let cancelled = false;

    async function load() {
      const [schedule, redLetterDays] = await Promise.all([
        listBriefSchedule(activeUserId),
        listBriefRedLetterDays(activeUserId),
      ]);
      if (cancelled) return;
      setBrief((prev) => ({ ...prev, firstName: "Helga", schedule, redLetterDays }));
    }

    load().catch((error) => {
      console.error("failed to load brief", error);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { brief };
}
