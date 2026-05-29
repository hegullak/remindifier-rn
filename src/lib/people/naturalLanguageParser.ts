import { logger } from "@/lib/logger";
import { parseNaturalPersonInputWithApi } from "@/lib/people/naturalLanguageParser.api";
import { parseNaturalPersonInputLocal } from "@/lib/people/naturalLanguageParser.local";
import {
  EMPTY_PARSED_PERSON_DRAFT,
  type ParsedPersonDraft,
} from "@/lib/people/naturalLanguageParser.types";

export type { ParsedPersonDraft } from "@/lib/people/naturalLanguageParser.types";

export async function parseNaturalPersonInput(input: string): Promise<ParsedPersonDraft> {
  const rawInput = input.trim();
  if (!rawInput) {
    return { ...EMPTY_PARSED_PERSON_DRAFT, rawInput };
  }

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim();
  if (apiKey) {
    try {
      const apiDraft = await parseNaturalPersonInputWithApi(rawInput, apiKey);
      if (apiDraft) return apiDraft;
    } catch (err) {
      logger.warn("natural_language_api_fallback", {
        error: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  return parseNaturalPersonInputLocal(rawInput);
}
