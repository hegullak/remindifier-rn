import * as Crypto from "expo-crypto";
import { createGathering } from "@/db/repos/gatheringsRepo";
import { createPersonEntry, listPeopleSummaries } from "@/db/repos/peopleRepo";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { logger } from "@/lib/logger";

export type SemanticIntakeConfirmResult =
  | { kind: "gathering"; gatheringId: string }
  | { kind: "follow_up"; entryId: string; personId: string }
  | { kind: "inbox_note" };

function buildTalkingPoints(parsed: SemanticIntakeParseResult) {
  return parsed.followUps.map((item) => ({
    id: Crypto.randomUUID(),
    kind: "question" as const,
    text: item.text,
    done: false as const,
  }));
}

export async function confirmSemanticIntake(
  userId: string,
  parsed: SemanticIntakeParseResult,
): Promise<SemanticIntakeConfirmResult> {
  const people = await listPeopleSummaries(userId);
  const personName = parsed.person?.name?.trim();
  const matchedPerson = personName
    ? people.find((p) => p.displayName.toLowerCase() === personName.toLowerCase())
    : undefined;

  if (parsed.event?.title) {
    const gatheringId = await createGathering(userId, {
      title: parsed.event.title,
      personIds: matchedPerson ? [matchedPerson.id] : [],
      scheduledAt: parsed.scheduledAt?.date ?? null,
      content:
        parsed.followUps.length > 0 ? { talkingPoints: buildTalkingPoints(parsed) } : undefined,
    });
    logger.info("semantic_intake_confirmed_gathering", { userId, gatheringId });
    return { kind: "gathering", gatheringId };
  }

  if (parsed.followUps.length > 0 && matchedPerson) {
    const entryId = await createPersonEntry(userId, {
      personId: matchedPerson.id,
      type: "follow_up",
      body: parsed.followUps.map((f) => f.text).join("\n"),
    });
    if (!entryId) throw new Error("follow_up_create_failed");
    logger.info("semantic_intake_confirmed_follow_up", { userId, personId: matchedPerson.id });
    return { kind: "follow_up", entryId, personId: matchedPerson.id };
  }

  throw new Error("semantic_intake_nothing_to_confirm");
}
