import { useEffect, useState } from "react";
import { listPeopleSummaries, type PersonSummary } from "@/db/repos/peopleRepo";

export function usePeopleData(userId: string | null | undefined) {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPeople([]);
      setLoading(false);
      setError(null);
      return;
    }
    const activeUserId = userId;
    let cancelled = false;
    setLoading(true);
    setError(null);

    listPeopleSummaries(activeUserId)
      .then((rows) => {
        if (cancelled) return;
        setPeople(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load people");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { people, loading, error };
}
