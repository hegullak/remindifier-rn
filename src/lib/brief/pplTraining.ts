import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

/** Push / Pull / Legs — never translate these session names in UI. */
export type PplSession = "push" | "pull" | "legs";

export const PPL_SESSIONS: readonly PplSession[] = ["push", "pull", "legs"];

export type TrainingDisplayLine =
  | { kind: "ppl"; active: PplSession }
  | { kind: "text"; text: string };

const SESSION_PATTERN = /\b(push|pull|legs)\b/i;

/** If text mentions a PPL session, render as highlighted program label instead of plain string. */
export function trainingLineFromString(text: string): TrainingDisplayLine {
  const match = text.match(SESSION_PATTERN);
  if (match) {
    const active = match[1].toLowerCase() as PplSession;
    if (PPL_SESSIONS.includes(active)) {
      return { kind: "ppl", active };
    }
  }
  return { kind: "text", text };
}

export function getFallbackTraining(locale: Locale): TrainingDisplayLine[] {
  return [
    { kind: "ppl", active: "pull" },
    { kind: "text", text: translate(locale, "brief.training.intervals") },
  ];
}
