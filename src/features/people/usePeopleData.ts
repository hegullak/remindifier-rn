import { useCallback, useEffect, useState } from "react";
import { listPeopleSummaries, type PersonSummary } from "@/db/repos/peopleRepo";

export function usePeopleData(userId: string | null | undefined) {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) {
      setPeople([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listPeopleSummaries(userId);
      setPeople(rows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { people, loading, error, reload };
}
