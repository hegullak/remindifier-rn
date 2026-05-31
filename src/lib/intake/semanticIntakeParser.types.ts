export type IntakeConfidence = "high" | "medium" | "low";

export type SemanticIntakeFieldKind = "person" | "event" | "follow_up" | "datetime" | "note";

export type SemanticIntakeField = {
  kind: SemanticIntakeFieldKind;
  value: string;
  confidence: IntakeConfidence;
};

export type SemanticIntakeParseResult = {
  rawText: string;
  fields: SemanticIntakeField[];
  ambiguities: string[];
  overallConfidence: IntakeConfidence;
  person: { name: string; confidence: IntakeConfidence } | null;
  event: { title: string; confidence: IntakeConfidence } | null;
  scheduledAt: { label: string; date: Date | null; confidence: IntakeConfidence } | null;
  scheduledAtOptions?: ScheduledAtOption[];
  followUps: { text: string; confidence: IntakeConfidence }[];
  freeFormNote: string | null;
};

export type SemanticIntakeParseOptions = {
  /** Anchor for relative weekdays; defaults to `new Date()` at call time. */
  referenceDate?: Date;
  locale?: "en" | "no";
};

export type ScheduledAtOption = {
  label: string;
  date: Date | null;
  confidence: IntakeConfidence;
};
