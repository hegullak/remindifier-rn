export const RED_LETTER_KINDS = [
  "Birthday",
  "Anniversary",
  "Smoke-free",
  "Snus-free",
  "Other",
] as const;

export type RedLetterKind = (typeof RED_LETTER_KINDS)[number];

export const RED_LETTER_OTHER_KINDS = RED_LETTER_KINDS.filter((k) => k !== "Birthday");

export const BIRTHDAY_SENTINEL_YEAR = "0001";

export interface RedLetterDayInput {
  id?: string;
  kind: RedLetterKind;
  label: string | null;
  eventDate: string;
  yearKnown: boolean;
  recurring: boolean;
}

/** @deprecated Use redLetterDisplayLabel from @/i18n/redLetterKinds with locale */
export function redLetterDisplayLabel(kind: string, label: string | null): string {
  if (kind === "Other" && label?.trim()) return label;
  return label?.trim() ? label : kind;
}

export function normalizeRedLetterDay(input: RedLetterDayInput): RedLetterDayInput {
  if (!input.yearKnown && /^\d{4}-(\d{2}-\d{2})$/.test(input.eventDate)) {
    const [, , m, d] = input.eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
    if (m && d) {
      return {
        ...input,
        eventDate: `${BIRTHDAY_SENTINEL_YEAR}-${m}-${d}`,
        yearKnown: false,
      };
    }
  }
  return input;
}
