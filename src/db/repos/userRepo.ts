import { eq } from "drizzle-orm";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { users } from "@/db/schema";
import {
  type BriefSectionId,
  DEFAULT_BRIEF_SECTION_ORDER,
  normalizeBriefSectionOrder,
} from "@/lib/brief/sections";

export async function getBriefSectionOrder(userId: string): Promise<BriefSectionId[]> {
  const db = await getDrizzleDbForUser(userId);
  const [row] = await db
    .select({ briefPreferences: users.briefPreferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return normalizeBriefSectionOrder(row?.briefPreferences?.sectionOrder);
}

export async function setBriefSectionOrder(userId: string, order: BriefSectionId[]) {
  const db = await getDrizzleDbForUser(userId);
  const normalized = normalizeBriefSectionOrder(order);
  await db
    .update(users)
    .set({
      briefPreferences: { sectionOrder: normalized },
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
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
