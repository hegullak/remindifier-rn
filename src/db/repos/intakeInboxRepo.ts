import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { logger } from "@/lib/logger";

export type IntakeInboxItem = {
  id: string;
  rawText: string;
  parsed: SemanticIntakeParseResult;
  createdAt: string;
};

function storageKey(userId: string): string {
  return `remindifier.intake.inbox.${userId}`;
}

export async function listIntakeInbox(userId: string): Promise<IntakeInboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntakeInboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.error("intake_inbox_list_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return [];
  }
}

export async function addToIntakeInbox(
  userId: string,
  item: { rawText: string; parsed: SemanticIntakeParseResult },
): Promise<IntakeInboxItem> {
  const existing = await listIntakeInbox(userId);
  const entry: IntakeInboxItem = {
    id: `inbox-${Crypto.randomUUID()}`,
    rawText: item.rawText,
    parsed: item.parsed,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...existing];
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  logger.info("intake_inbox_added", { userId, inboxId: entry.id });
  return entry;
}
