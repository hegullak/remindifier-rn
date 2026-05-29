import * as Crypto from "expo-crypto";
import { logger } from "@/lib/logger";
import type { TalkingPointKind } from "@/lib/gatherings/talkingPoints";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { anyOf: [{ type: "string" }, { type: "null" }] },
    talkingPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["topic", "question", "plan", "watch", "smalltalk"],
          },
          text: { type: "string" },
        },
        required: ["kind", "text"],
        additionalProperties: false,
      },
    },
    mentionedPeople: { type: "array", items: { type: "string" } },
  },
  required: ["title", "talkingPoints", "mentionedPeople"],
  additionalProperties: false,
} as const;

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
        kind === "topic" ||
        kind === "question" ||
        kind === "plan" ||
        kind === "watch" ||
        kind === "smalltalk"
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

const SYSTEM_PROMPT = `You extract structured fields from a note about an upcoming social event or gathering.

title: a short event title (3-6 words). Infer from context if not stated explicitly.
talkingPoints: classify each item the user wants to do, discuss, ask or plan:
  - topic: something to discuss or bring up
  - question: something to ask the other person
  - plan: something to arrange or organize together
  - watch: a film, show, sport or activity to experience together
  - smalltalk: a light conversation topic, icebreaker or shared interest
mentionedPeople: first names or full names of people mentioned (not the user themselves).
Do not invent items not in the text. Return ONLY valid JSON. No markdown.`;

export async function parseEventInput(input: string): Promise<ParsedEventDraft> {
  const trimmed = input.trim();
  if (!trimmed) return fallbackParse("");

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackParse(trimmed);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "event_draft",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      logger.warn("event_parser_http_error", { status: response.status });
      return fallbackParse(trimmed);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
    };
    const message = body.choices?.[0]?.message;
    if (!message?.content || message.refusal) {
      return fallbackParse(trimmed);
    }

    const parsed = JSON.parse(message.content) as unknown;
    const draft = normalizeApiPayload(parsed, trimmed);
    return draft ?? fallbackParse(trimmed);
  } catch (err) {
    logger.warn("event_parser_failed", {
      error: err instanceof Error ? err.name : "unknown",
    });
    return fallbackParse(trimmed);
  }
}
