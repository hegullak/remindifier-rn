import { useCallback, useEffect, useMemo, useState } from "react";
import { getSelectedCalendarIds } from "@/db/repos/userRepo";
import { useTranslation } from "@/i18n/LanguageContext";
import { subscribeBriefReload } from "@/lib/brief/briefRefresh";
import {
  type CalendarAccessStatus,
  type CalendarBriefEvent,
  fetchCalendarBriefEvents,
} from "@/lib/brief/calendarEvents";
import { getCalendarDayBounds } from "@/lib/brief/calendarWeek";
import {
  type DayTimeline,
  formatDayHeaderLabel,
  groupEventsByPeriod,
} from "@/lib/brief/dayTimeline";
import { logger } from "@/lib/logger";

export function useDayData(userId: string | null | undefined, initialOffset = 0) {
  const { locale } = useTranslation();
  const [dayOffset, setDayOffset] = useState(initialOffset);
  const [events, setEvents] = useState<CalendarBriefEvent[]>([]);
  const [calendarAccess, setCalendarAccess] = useState<CalendarAccessStatus>("denied");
  const [loading, setLoading] = useState(true);

  const dayBounds = useMemo(() => getCalendarDayBounds(new Date(), dayOffset), [dayOffset]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const selectedCalendarIds = userId ? await getSelectedCalendarIds(userId) : undefined;
      const result = await fetchCalendarBriefEvents(dayBounds, selectedCalendarIds);
      setEvents(result.events);
      setCalendarAccess(result.access);
    } catch (error) {
      logger.error("day_load_failed", { error: error instanceof Error ? error.name : "unknown" });
    } finally {
      setLoading(false);
    }
  }, [userId, dayBounds]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  useEffect(() => subscribeBriefReload(() => void reload()), [reload]);

  const shiftDay = useCallback((delta: number) => {
    setDayOffset((prev) => prev + delta);
  }, []);

  const goToToday = useCallback(() => {
    setDayOffset(0);
  }, []);

  const timeline: DayTimeline = useMemo(() => groupEventsByPeriod(events), [events]);
  const dateLabel = useMemo(
    () => formatDayHeaderLabel(dayBounds.start, dayOffset, locale),
    [dayBounds.start, dayOffset, locale],
  );

  return {
    dayOffset,
    date: dayBounds.start,
    dateLabel,
    timeline,
    events,
    calendarAccess,
    loading,
    shiftDay,
    goToToday,
    reload,
  };
}
