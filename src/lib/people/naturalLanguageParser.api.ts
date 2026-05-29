import { logger } from "@/lib/logger";
import {
  EMPTY_PARSED_PERSON_DRAFT,
  type ParsedPersonDraft,
} from "@/lib/people/naturalLanguageParser.types";
import { BIRTHDAY_SENTINEL_YEAR } from "@/lib/red-letter-day";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

type ApiDraftPayload = {
  displayName?: unknown;
  relationType?: unknown;
  birthday?: unknown;
  birthdayYearKnown?: unknown;
  funFacts?: unknown;
};

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
  const data = payload as ApiDraftPayload;

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
    rawInput,
  };
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function buildSystemPrompt(todayIso: string): string {
  return `You extract structured fields about ONE person from free-text memory fragments written by the user about someone they know.
Return ONLY valid JSON with this shape:
{
  "displayName": string | null,
  "relationType": string | null,
  "birthday": string | null,
  "birthdayYearKnown": boolean,
  "funFacts": string[]
}

Rules:
- displayName: the name of the person being described (the first/main person mentioned)
- relationType: how this person relates TO THE WRITER — e.g. "beste venn", "bror", "kollega". NOT roles the person has in their own life. If the text says "Han er min beste venn" the relationType is "beste venn". If the text later mentions "Søsteren hans, Marianne" that is about the person's own sister — ignore it for relationType.
- birthday: ISO YYYY-MM-DD when year is known; 0001-MM-DD when year unknown; 0001-MM-01 if only month known; null if no date found
- birthdayYearKnown: true only when you have a specific birth year — either stated directly or reliably inferred from age + date
- infer birth year from age clues: "feirer 50 årsdag i morgen" + "bursdag 12 mars" → born 12 March 1976 (using today ${todayIso})
- funFacts: memory fragments worth keeping, one idea per item, under 15 words each. Only facts about the main person. Do NOT include names or facts about other people mentioned (siblings, children, parents). Do not reword — keep the user's phrasing.
- do not invent facts not in the text

Today's date: ${todayIso}`;
}

export async function parseNaturalPersonInputWithApi(
  rawInput: string,
  apiKey: string,
): Promise<ParsedPersonDraft | null> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: buildSystemPrompt(todayIso),
      messages: [
        {
          role: "user",
          content: rawInput,
        },
      ],
    }),
  });

  if (!response.ok) {
    logger.warn("natural_language_api_http_error", { status: response.status });
    return null;
  }

  const body = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlock = body.content?.find((block) => block.type === "text");
  if (!textBlock?.text) {
    logger.warn("natural_language_api_empty_response");
    return null;
  }

  const parsed = extractJsonObject(textBlock.text);
  const draft = normalizeApiDraftPayload(parsed, rawInput);
  if (!draft) {
    logger.warn("natural_language_api_parse_error");
    return null;
  }

  return draft;
}

export function emptyDraft(rawInput: string): ParsedPersonDraft {
  return { ...EMPTY_PARSED_PERSON_DRAFT, rawInput };
}
