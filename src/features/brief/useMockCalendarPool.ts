import { useCallback, useEffect, useState } from "react";
import { getSelectedCalendarIds } from "@/db/repos/userRepo";
import { fetchCalendarBriefEvents } from "@/lib/brief/calendarEvents";
import { extractEventTemplates, type MockEventTemplate } from "@/lib/brief/mockFromCalendarPool";
import { logger } from "@/lib/logger";

const POOL_PAST_DAYS = 180;
const POOL_FUTURE_DAYS = 30;

/** Dev-only: builds a pool of real event templates from the user's calendar history for mock mode. */
export function useMockCalendarPool(userId: string | null | undefined, enabled: boolean) {
  const [pool, setPool] = useState<MockEventTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() - POOL_PAST_DAYS);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + POOL_FUTURE_DAYS);
      end.setHours(23, 59, 59, 999);

      const selectedCalendarIds = userId ? await getSelectedCalendarIds(userId) : undefined;
      const result = await fetchCalendarBriefEvents({ start, end }, selectedCalendarIds);
      setPool(extractEventTemplates(result.events));
    } catch (error) {
      logger.error("mock_calendar_pool_failed", {
        error: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (enabled && pool.length === 0 && !loading) {
      load().catch(() => {});
    }
  }, [enabled, pool.length, loading, load]);

  return { pool, loading };
}
