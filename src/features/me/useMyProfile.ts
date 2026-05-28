import { useUser } from "@clerk/clerk-expo";
import { useCallback, useEffect, useState } from "react";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import {
  getMyProfile,
  type MyProfile,
  type MyProfileUpsert,
  upsertMyProfile,
} from "@/db/repos/myProfileRepo";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";

function clerkDefaultName(user: ReturnType<typeof useUser>["user"]) {
  const first = user?.firstName?.trim();
  const last = user?.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  return user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "Me";
}

export function useMyProfile(userId: string | null | undefined) {
  const { user } = useUser();
  const { db, loading: dbLoading, error: dbError } = useUserDrizzleDb(userId);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey triggers refetch
  useEffect(() => {
    if (!userId || !db) {
      setProfile(null);
      setLoading(dbLoading);
      setError(dbError?.message ?? null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getMyProfile(db, userId)
      .then((row) => {
        if (cancelled) return;
        setProfile(row);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, db, dbLoading, dbError, reloadKey]);

  const save = useCallback(
    async (data: MyProfileUpsert) => {
      if (!userId) throw new Error("Not signed in");
      const database = db ?? (await getDrizzleDbForUser(userId));
      const displayName =
        data.displayName?.trim() || profile?.displayName || clerkDefaultName(user);
      await upsertMyProfile(database, userId, { ...data, displayName });
      reload();
    },
    [userId, db, profile?.displayName, user, reload],
  );

  const defaultDisplayName = clerkDefaultName(user);

  return { profile, loading: loading || dbLoading, error, save, reload, defaultDisplayName };
}
