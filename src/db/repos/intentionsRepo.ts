import { and, asc, eq, gte, isNull } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { intentions } from "@/db/schema";
import type { OpenIntention } from "@/lib/brief/intentionWeave";

/**
 * Loose intentions with a time horizon ("ring tante Berit denne uken").
 * Open = not completed, not dismissed, horizon not yet passed.
 */

export async function listOpenIntentions(
  userId: string,
  todayIso: string,
): Promise<OpenIntention[]> {
  const db = await getDrizzleDbForUser(userId);
  return db
    .select({
      id: intentions.id,
      text: intentions.text,
      dueBy: intentions.dueBy,
      notes: intentions.notes,
    })
    .from(intentions)
    .where(
      and(
        eq(intentions.userId, userId),
        isNull(intentions.completedAt),
        isNull(intentions.dismissedAt),
        gte(intentions.dueBy, todayIso),
      ),
    )
    .orderBy(asc(intentions.dueBy), asc(intentions.createdAt));
}

export async function addIntention(
  userId: string,
  input: { text: string; dueBy: string; notes?: string },
): Promise<string> {
  const db = await getDrizzleDbForUser(userId);
  const id = `int-${Crypto.randomUUID()}`;
  await db.insert(intentions).values({
    id,
    userId,
    text: input.text.trim(),
    notes: input.notes?.trim() || null,
    dueBy: input.dueBy,
    createdAt: new Date(),
  });
  return id;
}

export async function completeIntention(userId: string, id: string): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .update(intentions)
    .set({ completedAt: new Date() })
    .where(and(eq(intentions.userId, userId), eq(intentions.id, id)));
}

export async function dismissIntention(userId: string, id: string): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .update(intentions)
    .set({ dismissedAt: new Date() })
    .where(and(eq(intentions.userId, userId), eq(intentions.id, id)));
}

/** Dev helper: remove every intention for the user (test seeding cleanup). */
export async function deleteAllIntentions(userId: string): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db.delete(intentions).where(eq(intentions.userId, userId));
}
