import { useEffect, useState } from "react";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import * as schema from "@/db/schema";

export function useUserDrizzleDb(userId: string | null | undefined) {
  const [db, setDb] = useState<ExpoSQLiteDatabase<typeof schema> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setDb(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getDrizzleDbForUser(userId)
      .then((database) => {
        if (!cancelled) setDb(database);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to initialize database"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { db, loading, error };
}
