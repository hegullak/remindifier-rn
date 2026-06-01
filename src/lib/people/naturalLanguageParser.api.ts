import { logger } from "@/lib/logger";
import {
  EMPTY_PARSED_PERSON_DRAFT,
  type ParsedPersonDraft,
} from "@/lib/people/naturalLanguageParser.types";
import { BIRTHDAY_SENTINEL_YEAR } from "@/lib/red-letter-day";

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

export function parseNaturalPersonInputFromCompletion(
  rawInput: string,
  completionJson: string,
): ParsedPersonDraft | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(completionJson);
  } catch {
    logger.warn("natural_language_api_parse_error");
    return null;
  }

  return normalizeApiDraftPayload(parsed, rawInput);
}

export function emptyDraft(rawInput: string): ParsedPersonDraft {
  return { ...EMPTY_PARSED_PERSON_DRAFT, rawInput };
}
