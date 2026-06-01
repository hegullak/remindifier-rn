import * as Crypto from "expo-crypto";
import { logger } from "@/lib/logger";
import type { TalkingPointKind } from "@/lib/gatherings/talkingPoints";
import { fetchParseCompletion } from "@/lib/parse/parseApiClient";
import { extractCompletionContent } from "@/lib/parse/openaiTypes";

export type ParsedEventDraft = {
  title: string | null;
  talkingPoints: Array<{
    id: string;
    kind: TalkingPointKind;
    text: string;
    done: false;
  }>;
  mentionedPeople: string[];
  rawInput: string;
};

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fallbackParse(input: string): ParsedEventDraft {
  return {
    title: null,
    talkingPoints: input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({
        id: Crypto.randomUUID(),
        kind: "topic" as const,
        text,
        done: false as const,
      })),
    mentionedPeople: [],
    rawInput: input,
  };
}

function normalizeApiPayload(payload: unknown, rawInput: string): ParsedEventDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  const talkingPointsRaw = Array.isArray(data.talkingPoints) ? data.talkingPoints : [];
  const talkingPoints = talkingPointsRaw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      const kind = row.kind;
      const text = asNullableString(row.text);
      if (!text) return null;
      const validKind =
        kind === "question" ||
        kind === "topic" ||
        kind === "smalltalk" ||
        kind === "headsup"
          ? kind
          : "topic";
      return {
        id: Crypto.randomUUID(),
        kind: validKind as TalkingPointKind,
        text,
        done: false as const,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const mentionedPeople = Array.isArray(data.mentionedPeople)
    ? data.mentionedPeople
        .filter((name): name is string => typeof name === "string")
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  return {
    title: asNullableString(data.title),
    talkingPoints,
    mentionedPeople,
    rawInput,
  };
}

export type ParseEventInputOptions = {
  getToken?: () => Promise<string | null>;
};

export async function parseEventInput(
  input: string,
  options: ParseEventInputOptions = {},
): Promise<ParsedEventDraft> {
  const trimmed = input.trim();
  if (!trimmed) return fallbackParse("");

  if (options.getToken && process.env.EXPO_PUBLIC_PARSE_API_URL?.trim()) {
    try {
      const completion = await fetchParseCompletion(trimmed, "event", options.getToken, {
        timeoutMs: 5_000,
      });
      const content = completion ? extractCompletionContent(completion) : null;
      if (content) {
        const parsed = JSON.parse(content) as unknown;
        const draft = normalizeApiPayload(parsed, trimmed);
        if (draft) return draft;
      }
    } catch (err) {
      logger.warn("event_parser_failed", {
        error: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  return fallbackParse(trimmed);
}
