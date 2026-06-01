import { logger } from "@/lib/logger";
import { parseNaturalPersonInputFromCompletion } from "@/lib/people/naturalLanguageParser.api";
import { parseNaturalPersonInputLocal } from "@/lib/people/naturalLanguageParser.local";
import {
  EMPTY_PARSED_PERSON_DRAFT,
  type ParsedPersonDraft,
} from "@/lib/people/naturalLanguageParser.types";
import { fetchParseCompletion } from "@/lib/parse/parseApiClient";
import { extractCompletionContent } from "@/lib/parse/openaiTypes";

export type { ParsedPersonDraft } from "@/lib/people/naturalLanguageParser.types";

export type ParseNaturalPersonInputOptions = {
  getToken?: () => Promise<string | null>;
};

export async function parseNaturalPersonInput(
  input: string,
  options: ParseNaturalPersonInputOptions = {},
): Promise<ParsedPersonDraft> {
  const rawInput = input.trim();
  if (!rawInput) {
    return { ...EMPTY_PARSED_PERSON_DRAFT, rawInput };
  }

  if (options.getToken && process.env.EXPO_PUBLIC_PARSE_API_URL?.trim()) {
    try {
      const completion = await fetchParseCompletion(rawInput, "person", options.getToken, {
        timeoutMs: 5_000,
      });
      const content = completion ? extractCompletionContent(completion) : null;
      if (content) {
        const apiDraft = parseNaturalPersonInputFromCompletion(rawInput, content);
        if (apiDraft) return apiDraft;
      }
    } catch (err) {
      logger.warn("natural_language_api_fallback", {
        error: err instanceof Error ? err.name : "unknown",
      });
    }
  }

  return parseNaturalPersonInputLocal(rawInput);
}
