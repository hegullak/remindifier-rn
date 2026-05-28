import { useEffect, useState } from "react";
import { seedLocalData } from "@/db/seed";

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
      if (!cancelled) setReady(true);
    }

    boot().catch((error) => {
      console.error("bootstrap failed", error);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, migrationsReady]);

  return { ready };
}
