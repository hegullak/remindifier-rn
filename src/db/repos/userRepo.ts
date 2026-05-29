import { eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { type UserBriefPreferences, users } from "@/db/schema";
import {
  type BriefSectionId,
  DEFAULT_BRIEF_SECTION_ORDER,
  normalizeBriefSectionOrder,
} from "@/lib/brief/sections";
import { logger } from "@/lib/logger";
import { logRepoError } from "@/lib/repoLog";

export async function getBriefSectionOrder(userId: string): Promise<BriefSectionId[]> {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db
    .select({ briefPreferences: users.briefPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return normalizeBriefSectionOrder(row?.briefPreferences?.sectionOrder);
}

async function getUserBriefPreferences(userId: string): Promise<UserBriefPreferences> {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db
    .select({ briefPreferences: users.briefPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.briefPreferences ?? {};
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const prefs = await getUserBriefPreferences(userId);
  return typeof prefs.onboardingCompletedAt === "number";
}

export async function completeOnboarding(userId: string) {
  try {
    const db = await getDrizzleDbForUser(userId);
    const prefs = await getUserBriefPreferences(userId);
    await db
      .update(users)
      .set({
        briefPreferences: { ...prefs, onboardingCompletedAt: Date.now() },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    logger.info("onboarding_completed", { userId });
  } catch (err) {
    logRepoError("onboarding_complete_failed", err, { userId });
    throw err;
  }
}

export async function setBriefSectionOrder(userId: string, order: BriefSectionId[]) {
  try {
    const db = await getDrizzleDbForUser(userId);
    const normalized = normalizeBriefSectionOrder(order);
    const prefs = await getUserBriefPreferences(userId);
    await db
      .update(users)
      .set({
        briefPreferences: { ...prefs, sectionOrder: normalized },
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    logger.info("brief_section_order_updated", { userId });
  } catch (err) {
    logRepoError("brief_section_order_update_failed", err, { userId });
  }
}

export async function ensureDefaultBriefPreferences(userId: string) {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return;
  if (row.briefPreferences?.sectionOrder?.length) return;
  await db
    .update(users)
    .set({
      briefPreferences: { sectionOrder: DEFAULT_BRIEF_SECTION_ORDER },
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
