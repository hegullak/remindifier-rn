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
      try {
        await seedLocalData(activeUserId);
        logger.info("bootstrap_seed_local_done");
      } catch (error) {
        logger.error("bootstrap_seed_local_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
      }

      try {
        await patchDevMilestoneSeed(activeUserId);
      } catch (error) {
        logger.error("bootstrap_milestone_patch_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
      }

      try {
        await ensureDefaultBriefPreferences(activeUserId);
      } catch (error) {
        logger.error("bootstrap_preferences_failed", {
          error: error instanceof Error ? error.name : "unknown",
        });
      }

      if (!cancelled) {
        logger.info("bootstrap_ready");
        setReady(true);
      }

      // Calendar permission can block indefinitely in Expo Go — never gate UI on it.
      void seedDevCalendar();
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
