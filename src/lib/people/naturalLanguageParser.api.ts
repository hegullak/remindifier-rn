import { logger } from "@/lib/logger";
import {
  EMPTY_PARSED_PERSON_DRAFT,
  type ParsedPersonDraft,
} from "@/lib/people/naturalLanguageParser.types";
import { BIRTHDAY_SENTINEL_YEAR } from "@/lib/red-letter-day";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

// JSON Schema for OpenAI structured outputs (strict: true).
// All fields required, additionalProperties: false, nullable via anyOf.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    displayName: { anyOf: [{ type: "string" }, { type: "null" }] },
    relationType: { anyOf: [{ type: "string" }, { type: "null" }] },
    birthday: { anyOf: [{ type: "string" }, { type: "null" }] },
    birthdayYearKnown: { type: "boolean" },
    funFacts: { type: "array", items: { type: "string" } },
    pendingActions: { type: "array", items: { type: "string" } },
  },
  required: [
    "displayName",
    "relationType",
    "birthday",
    "birthdayYearKnown",
    "funFacts",
    "pendingActions",
  ],
  additionalProperties: false,
} as const;

function isIsoDate(value: string): boolean {
  return /^(?:\d{4}|0001)-\d{2}-\d{2}$/.test(value);
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFunFacts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeApiDraftPayload(
  payload: unknown,
  rawInput: string,
): ParsedPersonDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  let birthday = asNullableString(data.birthday);
  const birthdayYearKnown = data.birthdayYearKnown === true;
  if (birthday && !isIsoDate(birthday)) return null;
  if (birthday && !birthdayYearKnown && !birthday.startsWith(BIRTHDAY_SENTINEL_YEAR)) {
    const parts = birthday.split("-");
    if (parts.length === 3) {
      birthday = `${BIRTHDAY_SENTINEL_YEAR}-${parts[1]}-${parts[2]}`;
    }
  }

  return {
    displayName: asNullableString(data.displayName),
    relationType: asNullableString(data.relationType),
    birthday,
    birthdayYearKnown,
    funFacts: asFunFacts(data.funFacts),
    pendingActions: asFunFacts(data.pendingActions),
    rawInput,
  };
}

function buildSystemPrompt(todayIso: string): string {
  return `You extract structured fields about ONE person from free-text memory fragments written by the user about someone they know.

Rules:
- displayName: the name of the person being described (the first/main person mentioned)
- relationType: how this person relates TO THE WRITER — e.g. "beste venn", "bror", "kollega". NOT roles the person has in their own life. If the text says "Han er min beste venn" the relationType is "beste venn". If the text later mentions "Søsteren hans, Marianne" that describes the person's own sister — ignore it for relationType.
- birthday: ISO YYYY-MM-DD when year is known; 0001-MM-DD when year unknown; 0001-MM-01 if only month known; null if no date found
- birthdayYearKnown: true only when you have a specific birth year — either stated directly or reliably inferred from age + date
- infer birth year from age clues: "feirer 50 årsdag i morgen" + "bursdag 12 mars" → born 12 March 1976 (using today ${todayIso})
- funFacts: permanent memory fragments worth remembering long-term. One idea per item, under 15 words. Only facts about the main person. Do NOT include action items or intentions here.
- pendingActions: things the user intends to do or ask — action items for an upcoming interaction. E.g. "Spørre om barna hans", "Snakke med moren hans på festen". User's phrasing, under 15 words each. Empty array if none.
- do not invent facts not in the text

Today's date: ${todayIso}`;
}

export async function parseNaturalPersonInputWithApi(
  rawInput: string,
  apiKey: string,
): Promise<ParsedPersonDraft | null> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt(todayIso) },
        { role: "user", content: rawInput },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "person_draft",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    logger.warn("natural_language_api_http_error", { status: response.status });
    return null;
  }

  const body = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string | null; refusal?: string | null };
    }>;
  };

  const message = body.choices?.[0]?.message;
  if (!message) {
    logger.warn("natural_language_api_empty_response");
    return null;
  }

  // Model refused (e.g. content policy) — fall back gracefully
  if (message.refusal) {
    logger.warn("natural_language_api_refusal");
    return null;
  }

  if (!message.content) {
    logger.warn("natural_language_api_no_content");
    return null;
  }

  // With strict structured outputs, content is guaranteed valid JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    logger.warn("natural_language_api_parse_error");
    return null;
  }

  return normalizeApiDraftPayload(parsed, rawInput);
}

export function emptyDraft(rawInput: string): ParsedPersonDraft {
  return { ...EMPTY_PARSED_PERSON_DRAFT, rawInput };
}
