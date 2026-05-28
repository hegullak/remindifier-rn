import { eq } from "drizzle-orm";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type * as schema from "@/db/schema";
import { type MyProfile, myProfile } from "@/db/schema";

export type { MyProfile };

export type MyProfileUpsert = Partial<
  Pick<MyProfile, "displayName" | "birthday" | "birthdayYearKnown" | "about" | "contactPreference">
>;

export async function getMyProfile(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: string,
): Promise<MyProfile | null> {
  const rows = await db.select().from(myProfile).where(eq(myProfile.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertMyProfile(
  db: ExpoSQLiteDatabase<typeof schema>,
  userId: string,
  data: MyProfileUpsert,
): Promise<void> {
  const existing = await getMyProfile(db, userId);

  if (existing) {
    await db
      .update(myProfile)
      .set({
        displayName: data.displayName ?? existing.displayName,
        birthday: data.birthday !== undefined ? data.birthday : existing.birthday,
        birthdayYearKnown:
          data.birthdayYearKnown !== undefined
            ? data.birthdayYearKnown
            : existing.birthdayYearKnown,
        about: data.about !== undefined ? data.about : existing.about,
        contactPreference:
          data.contactPreference !== undefined
            ? data.contactPreference
            : existing.contactPreference,
      })
      .where(eq(myProfile.userId, userId));
    return;
  }

  if (!data.displayName?.trim()) {
    throw new Error("Display name is required");
  }

  await db.insert(myProfile).values({
    userId,
    displayName: data.displayName.trim(),
    birthday: data.birthday ?? null,
    birthdayYearKnown: data.birthdayYearKnown ?? false,
    about: data.about ?? null,
    contactPreference: data.contactPreference ?? null,
  });
}
