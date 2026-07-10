import { and, eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { dailyLookForward } from "@/db/schema";
import { localDateKey, type DailyLookForwardRecord } from "@/lib/brief/lookForward";

function rowToRecord(row: { text: string | null; dismissed: boolean }): DailyLookForwardRecord {
  return { text: row.text, dismissed: row.dismissed };
}

export async function getDailyLookForward(
  userId: string,
  date = localDateKey(),
): Promise<DailyLookForwardRecord | null> {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db
    .select({ text: dailyLookForward.text, dismissed: dailyLookForward.dismissed })
    .from(dailyLookForward)
    .where(and(eq(dailyLookForward.userId, userId), eq(dailyLookForward.date, date)))
    .limit(1);
  return row ? rowToRecord(row) : null;
}

export async function saveDailyLookForward(
  userId: string,
  text: string,
  date = localDateKey(),
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  const trimmed = text.trim();
  const now = new Date();
  const id = `${userId}:${date}`;

  await db
    .insert(dailyLookForward)
    .values({
      id,
      userId,
      date,
      text: trimmed,
      dismissed: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dailyLookForward.id,
      set: { text: trimmed, dismissed: false, updatedAt: now },
    });
}

export async function dismissDailyLookForward(userId: string, date = localDateKey()): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  const now = new Date();
  const id = `${userId}:${date}`;

  await db
    .insert(dailyLookForward)
    .values({
      id,
      userId,
      date,
      text: null,
      dismissed: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dailyLookForward.id,
      set: { dismissed: true, text: null, updatedAt: now },
    });
}

export async function deleteDailyLookForward(userId: string, date = localDateKey()): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .delete(dailyLookForward)
    .where(and(eq(dailyLookForward.userId, userId), eq(dailyLookForward.date, date)));
}
