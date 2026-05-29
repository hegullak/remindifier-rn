import { useEffect, useState } from "react";
import { ensureDefaultBriefPreferences } from "@/db/repos/userRepo";
import { patchDevMilestoneSeed, seedLocalData } from "@/db/seed";
import { seedDevCalendar } from "@/db/seedCalendar";
import { logger } from "@/lib/logger";

export function useBootstrapApp(userId: string | null | undefined, migrationsReady: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId || !migrationsReady) {
      setReady(false);
      return;
    }
    const activeUserId = userId;

    let cancelled = false;

    async function boot() {
      await seedLocalData(activeUserId);
      await patchDevMilestoneSeed(activeUserId);
      await seedDevCalendar();
      await ensureDefaultBriefPreferences(activeUserId);
      if (!cancelled) setReady(true);
    }

    boot().catch((error) => {
      logger.error("bootstrap_failed", { error: error instanceof Error ? error.name : "unknown" });
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, migrationsReady]);

  return { ready };
}
