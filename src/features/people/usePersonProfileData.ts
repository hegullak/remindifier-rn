import { useEffect, useState } from "react";
import { getPersonProfileBundle } from "@/db/repos/peopleRepo";

type PersonBundle = Awaited<ReturnType<typeof getPersonProfileBundle>>;

export function usePersonProfileData(
  userId: string | null | undefined,
  personId: string | undefined,
) {
  const [bundle, setBundle] = useState<PersonBundle>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is an intentional reload trigger
  useEffect(() => {
    if (!userId || !personId) {
      setBundle(null);
      setLoading(false);
      setError(null);
      return;
    }
    const activeUserId = userId;
    const activePersonId = personId;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPersonProfileBundle(activeUserId, activePersonId)
      .then((result) => {
        if (cancelled) return;
        setBundle(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load person profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, personId, reloadKey]);

  const reload = () => setReloadKey((n) => n + 1);

  return { bundle, loading, error, reload };
}
