import { and, asc, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { intentions } from "@/db/schema";
import { matchesIntentionText, mergeCarriedNotes } from "@/lib/brief/intentionThread";
import type { OpenIntention } from "@/lib/brief/intentionWeave";

/**
 * Loose intentions with a time horizon ("ring tante Berit denne uken").
 * Open = not completed, not dismissed, horizon not yet passed.
 */

/** How many recent completed-with-afterNote rows to consider when threading. */
const THREAD_LOOKBACK_ROWS = 50;

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

/**
 * Most recent after-note left on a completed intention whose text matches —
 * the invisible thread that carries "noe verdt å huske" across occurrences.
 */
async function findCarriedAfterNote(userId: string, text: string): Promise<string | null> {
  const db = await getDrizzleDbForUser(userId);
  const rows = await db
    .select({ text: intentions.text, afterNote: intentions.afterNote })
    .from(intentions)
    .where(
      and(
        eq(intentions.userId, userId),
        isNotNull(intentions.completedAt),
        isNotNull(intentions.afterNote),
      ),
    )
    .orderBy(desc(intentions.completedAt))
    .limit(THREAD_LOOKBACK_ROWS);
  const match = rows.find((row) => matchesIntentionText(row.text, text));
  return match?.afterNote ?? null;
}

export async function addIntention(
  userId: string,
  input: { text: string; dueBy: string; notes?: string },
): Promise<string> {
  const db = await getDrizzleDbForUser(userId);
  const id = `int-${Crypto.randomUUID()}`;
  const carried = await findCarriedAfterNote(userId, input.text);
  await db.insert(intentions).values({
    id,
    userId,
    text: input.text.trim(),
    notes: mergeCarriedNotes(input.notes, carried),
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

/** Stores the after-moment note ("noe verdt å huske til neste gang?") on a resolved intention. */
export async function setIntentionAfterNote(
  userId: string,
  id: string,
  afterNote: string,
): Promise<void> {
  const db = await getDrizzleDbForUser(userId);
  await db
    .update(intentions)
    .set({ afterNote: afterNote.trim() || null })
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
