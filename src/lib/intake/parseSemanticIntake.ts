import type { SemanticIntakeParseOptions } from "@/lib/intake/semanticIntakeParser.types";
import {
  enrichIntakeWithLocalSchedule,
  finalizeIntakePartial,
  mergeOrphanGratulereFollowUps,
  parseSemanticIntakeWithApi,
} from "@/lib/intake/semanticIntakeParser.api";
import { parseSemanticIntakeLocal } from "@/lib/intake/semanticIntakeParser";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { fetchParseCompletion } from "@/lib/parse/parseApiClient";
import { extractCompletionContent } from "@/lib/parse/openaiTypes";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function withMergedFollowUps(result: SemanticIntakeParseResult): SemanticIntakeParseResult {
  const { fields: _f, overallConfidence: _o, ...partial } = result;
  return finalizeIntakePartial({
    ...partial,
    followUps: mergeOrphanGratulereFollowUps(partial.followUps),
  });
}

/**
 * Tries parse API (5s timeout) when Clerk token + EXPO_PUBLIC_PARSE_API_URL are set;
 * falls back to local heuristics.
 */
export async function parseSemanticIntake(
  rawInput: string,
  options: SemanticIntakeParseOptions = {},
): Promise<SemanticIntakeParseResult> {
  const referenceDate = options.referenceDate ?? new Date();
  const locale = options.locale ?? "en";
  const rawText = normalizeWhitespace(rawInput);

  if (!rawText) {
    return parseSemanticIntakeLocal(rawInput, options);
  }

  if (options.getToken && process.env.EXPO_PUBLIC_PARSE_API_URL?.trim()) {
    const completion = await fetchParseCompletion(rawText, "intake", options.getToken, {
      timeoutMs: 5_000,
    });
    const content = completion ? extractCompletionContent(completion) : null;
    if (content) {
      const fromApi = await parseSemanticIntakeWithApi(rawText, {
        referenceDate,
        locale,
        completionJson: content,
      });
      if (fromApi) {
        return withMergedFollowUps(
          enrichIntakeWithLocalSchedule(fromApi, rawInput, referenceDate, locale),
        );
      }
    }
  }

  return withMergedFollowUps(parseSemanticIntakeLocal(rawInput, options));
}

export { parseSemanticIntakeLocal, applySemanticIntakeEdits } from "@/lib/intake/semanticIntakeParser";
