import * as Crypto from "expo-crypto";
import { getDrizzleDbForUser } from "@/db/drizzleClient";
import { gatheringParticipants, gatherings } from "@/db/schema";
import { logger } from "@/lib/logger";
import { logRepoError } from "@/lib/repoLog";

export async function createGatheringWithTalkingPoints(
  userId: string,
  personId: string,
  personName: string,
  talkingPoints: string[],
): Promise<string> {
  try {
    const db = await getDrizzleDbForUser(userId);
    const gatheringId = `g-${Crypto.randomUUID()}`;

    await db.insert(gatherings).values({
      id: gatheringId,
      userId,
      title: personName,
      description: talkingPoints.join("\n"),
      type: "other",
      status: "planned",
    });

    await db.insert(gatheringParticipants).values({
      id: `gp-${Crypto.randomUUID()}`,
      gatheringId,
      personId,
      userId,
    });

    logger.info("gathering_created_from_intake", { userId, gatheringId, personId });
    return gatheringId;
  } catch (err) {
    logRepoError("gathering_create_failed", err, { userId, personId });
    throw err;
  }
}
