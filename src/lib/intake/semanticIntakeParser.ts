import type {
  IntakeConfidence,
  SemanticIntakeField,
  SemanticIntakeParseOptions,
  SemanticIntakeParseResult,
} from "@/lib/intake/semanticIntakeParser.types";

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  søndag: 0,
  monday: 1,
  mon: 1,
  mandag: 1,
  tuesday: 2,
  tue: 2,
  tirsdag: 2,
  wednesday: 3,
  wed: 3,
  onsdag: 3,
  thursday: 4,
  thu: 4,
  torsdag: 4,
  friday: 5,
  fri: 5,
  fredag: 5,
  saturday: 6,
  sat: 6,
  lørdag: 6,
  lordag: 6,
};

const WORD_HOUR: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  en: 1,
  to: 2,
  tre: 3,
  fire: 4,
  fem: 5,
  seks: 6,
  syv: 7,
  sju: 7,
  åtte: 8,
  ni: 9,
  ti: 10,
  elleve: 11,
  tolv: 12,
};

const EVENT_KEYWORDS =
  /\b(dinner|lunch|breakfast|brunch|coffee|drinks|party|meeting|visit|middag|lunsj|frokost|kaffe|besøk|fest|møte)\b/i;

const FOLLOW_UP_PATTERNS: RegExp[] = [
  /\bremember\s+to\s+(.+?)(?:[,.]|$)/i,
  /\bdon'?t\s+forget\s+to\s+(.+?)(?:[,.]|$)/i,
  /\bask\s+(?:about|him|her|them)\s+(.+?)(?:[,.]|$)/i,
  /\bhusk\s+å\s+(.+?)(?:[,.]|$)/i,
  /\bikke\s+glem\s+å\s+(.+?)(?:[,.]|$)/i,
  /\bspør\s+(?:om\s+)?(.+?)(?:[,.]|$)/i,
];

const PERSON_WITH_PATTERN = /\b(?:with|med|hos)\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)/;

const EVENING_CONTEXT = /\b(dinner|middag|evening|kveld|drinks|party|fest)\b/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function extractFollowUps(text: string): { followUps: string[]; remainder: string } {
  const followUps: string[] = [];
  let remainder = text;

  for (const pattern of FOLLOW_UP_PATTERNS) {
    const match = remainder.match(pattern);
    if (!match?.[1]) continue;
    const phrase = normalizeWhitespace(match[1]);
    if (phrase.length >= 3 && !followUps.includes(phrase)) {
      followUps.push(phrase);
    }
    remainder = remainder.replace(match[0], " ").trim();
  }

  return { followUps, remainder: normalizeWhitespace(remainder.replace(/,\s*,/g, ",")) };
}

function extractPerson(text: string): { name: string | null; confidence: IntakeConfidence } {
  const match = text.match(PERSON_WITH_PATTERN);
  if (!match?.[1]) return { name: null, confidence: "low" };
  const parts = match[1].trim().split(/\s+/);
  if (parts.length === 2 && WEEKDAYS[parts[1].toLowerCase()] != null) {
    return { name: capitalizeWord(parts[0]), confidence: "high" };
  }
  const name = normalizeWhitespace(parts.map(capitalizeWord).join(" "));
  return { name, confidence: "high" };
}

const WEEKDAY_PATTERN =
  "sunday|sun|søndag|monday|mon|mandag|tuesday|tue|tirsdag|wednesday|wed|onsdag|thursday|thu|torsdag|friday|fri|fredag|saturday|sat|lørdag|lordag";

function extractEventTitle(
  text: string,
  personName: string | null,
): { title: string | null; confidence: IntakeConfidence } {
  const trimmed = normalizeWhitespace(text);
  if (!trimmed) return { title: null, confidence: "low" };

  const eventMatch = trimmed.match(
    new RegExp(
      `\\b((?:dinner|lunch|breakfast|brunch|coffee|drinks|party|meeting|visit|middag|lunsj|frokost|kaffe|besøk|fest|møte)\\s+(?:with|med|hos)\\s+[A-ZÆØÅ][a-zæøå]+)(?=\\s+(?:${WEEKDAY_PATTERN})\\b|[,.]|\\s+(?:at|kl\\.?)|$)`,
      "i",
    ),
  );
  if (eventMatch?.[1]) {
    const title = eventMatch[1]
      .split(/\s+/)
      .map((word, i) => (i === 0 ? capitalizeWord(word) : word))
      .join(" ");
    return { title, confidence: "high" };
  }

  if (personName && EVENT_KEYWORDS.test(trimmed)) {
    const keyword = trimmed.match(EVENT_KEYWORDS)?.[0] ?? "Meeting";
    return {
      title: `${capitalizeWord(keyword)} with ${personName}`,
      confidence: "medium",
    };
  }

  const firstClause = trimmed.split(/[,;]/)[0]?.trim();
  if (firstClause && EVENT_KEYWORDS.test(firstClause)) {
    return { title: capitalizeWord(firstClause), confidence: "medium" };
  }

  if (personName) {
    return { title: `Time with ${personName}`, confidence: "low" };
  }

  return { title: null, confidence: "low" };
}

function parseHourToken(
  token: string,
  meridiem: string | undefined,
  eveningBias: boolean,
): number | null {
  const lower = token.toLowerCase();
  let hour: number | null = null;

  if (/^\d{1,2}$/.test(lower)) {
    hour = Number.parseInt(lower, 10);
  } else if (WORD_HOUR[lower] != null) {
    hour = WORD_HOUR[lower];
  }

  if (hour == null || hour < 0 || hour > 23) return null;

  const pm = meridiem?.toLowerCase() === "pm";
  const am = meridiem?.toLowerCase() === "am";

  if (pm && hour <= 12) {
    return hour === 12 ? 12 : hour + 12;
  }
  if (am && hour === 12) {
    return 0;
  }
  if (!meridiem && eveningBias && hour >= 1 && hour <= 11) {
    return hour + 12;
  }
  return hour;
}

function extractDateTime(
  text: string,
  referenceDate: Date,
  locale: "en" | "no",
): { label: string; date: Date | null; confidence: IntakeConfidence } | null {
  const lower = text.toLowerCase();
  let weekday: number | null = null;
  let weekdayLabel: string | null = null;

  for (const [name, index] of Object.entries(WEEKDAYS)) {
    const pattern = new RegExp(`\\b${name}\\b`, "i");
    if (pattern.test(lower)) {
      weekday = index;
      weekdayLabel = capitalizeWord(name);
      break;
    }
  }

  const clockMatch =
    lower.match(
      /\b(?:at|kl\.?|ca\.?)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|en|to|tre|fire|fem|seks|syv|sju|åtte|ni|ti|elleve|tolv)(?::(\d{2}))?\s*(am|pm)?\b/i,
    ) ?? lower.match(/\b(\d{1,2}):(\d{2})\b/);

  let hour: number | null = null;
  let minute = 0;

  if (clockMatch) {
    if (clockMatch[2] != null && /^\d{2}$/.test(clockMatch[2])) {
      hour = Number.parseInt(clockMatch[1], 10);
      minute = Number.parseInt(clockMatch[2], 10);
    } else {
      hour = parseHourToken(clockMatch[1], clockMatch[3], EVENING_CONTEXT.test(text));
      if (clockMatch[2] && /^\d{2}$/.test(clockMatch[2])) {
        minute = Number.parseInt(clockMatch[2], 10);
      }
    }
  }

  if (weekday == null && hour == null) {
    return null;
  }

  const target = new Date(referenceDate);
  target.setHours(0, 0, 0, 0);

  if (weekday != null) {
    const current = target.getDay();
    let delta = (weekday - current + 7) % 7;
    if (delta === 0) delta = 0;
    target.setDate(target.getDate() + delta);
  }

  if (hour != null) {
    target.setHours(hour, minute, 0, 0);
  }

  const timeLabel =
    hour != null
      ? target.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const parts: string[] = [];
  if (weekdayLabel) parts.push(weekdayLabel);
  if (timeLabel) parts.push(timeLabel);

  const confidence: IntakeConfidence =
    weekday != null && hour != null ? "high" : weekday != null || hour != null ? "medium" : "low";

  return {
    label: parts.join(" ") || text,
    date: hour != null || weekday != null ? target : null,
    confidence,
  };
}

function buildFields(
  result: Omit<SemanticIntakeParseResult, "fields" | "overallConfidence">,
): SemanticIntakeField[] {
  const fields: SemanticIntakeField[] = [];
  if (result.event) {
    fields.push({ kind: "event", value: result.event.title, confidence: result.event.confidence });
  }
  if (result.scheduledAt) {
    fields.push({
      kind: "datetime",
      value: result.scheduledAt.label,
      confidence: result.scheduledAt.confidence,
    });
  }
  if (result.person) {
    fields.push({
      kind: "person",
      value: result.person.name,
      confidence: result.person.confidence,
    });
  }
  for (const followUp of result.followUps) {
    fields.push({ kind: "follow_up", value: followUp.text, confidence: followUp.confidence });
  }
  if (result.freeFormNote) {
    fields.push({ kind: "note", value: result.freeFormNote, confidence: "medium" });
  }
  return fields;
}

function overallConfidence(fields: SemanticIntakeField[], ambiguities: string[]): IntakeConfidence {
  if (fields.length === 0) return "low";
  if (ambiguities.includes("free_form_only")) return "low";
  if (ambiguities.length > 0) return "medium";
  const lows = fields.filter((f) => f.confidence === "low").length;
  if (lows > 0) return "medium";
  return "high";
}

export function parseSemanticIntake(
  rawInput: string,
  options: SemanticIntakeParseOptions = {},
): SemanticIntakeParseResult {
  const rawText = normalizeWhitespace(rawInput);
  const referenceDate = options.referenceDate ?? new Date();
  const locale = options.locale ?? "en";

  if (!rawText) {
    return {
      rawText: "",
      fields: [],
      ambiguities: [],
      overallConfidence: "low",
      person: null,
      event: null,
      scheduledAt: null,
      followUps: [],
      freeFormNote: null,
    };
  }

  const { followUps: followUpTexts, remainder } = extractFollowUps(rawText);
  const personExtract = extractPerson(remainder);
  const eventExtract = extractEventTitle(remainder, personExtract.name);
  const scheduledAt = extractDateTime(remainder, referenceDate, locale);

  const ambiguities: string[] = [];
  if (!eventExtract.title && !personExtract.name) {
    ambiguities.push("no_event_or_person");
  }
  if (personExtract.name && !PERSON_WITH_PATTERN.test(rawText)) {
    ambiguities.push("person_unclear");
  }
  if (scheduledAt?.confidence === "medium") {
    ambiguities.push("datetime_partial");
  }
  if (followUpTexts.length === 0 && /\b(remember|husk|ask|spør)\b/i.test(rawText)) {
    ambiguities.push("follow_up_unclear");
  }

  const followUps = followUpTexts.map((text) => ({
    text,
    confidence: "high" as const,
  }));

  let freeFormNote: string | null = null;
  if (!eventExtract.title && !personExtract.name && followUps.length === 0) {
    freeFormNote = rawText;
    ambiguities.push("free_form_only");
  }

  const partial: Omit<SemanticIntakeParseResult, "fields" | "overallConfidence"> = {
    rawText,
    ambiguities,
    person: personExtract.name
      ? { name: personExtract.name, confidence: personExtract.confidence }
      : null,
    event: eventExtract.title
      ? { title: eventExtract.title, confidence: eventExtract.confidence }
      : null,
    scheduledAt,
    followUps,
    freeFormNote,
  };

  const fields = buildFields(partial);
  return {
    ...partial,
    fields,
    overallConfidence: overallConfidence(fields, ambiguities),
  };
}

export function applySemanticIntakeEdits(
  base: SemanticIntakeParseResult,
  edits: {
    eventTitle?: string;
    personName?: string;
    scheduledLabel?: string;
    followUpText?: string;
  },
): SemanticIntakeParseResult {
  const next: Omit<SemanticIntakeParseResult, "fields" | "overallConfidence"> = {
    ...base,
    event: edits.eventTitle?.trim()
      ? { title: edits.eventTitle.trim(), confidence: "high" }
      : base.event,
    person: edits.personName?.trim()
      ? { name: edits.personName.trim(), confidence: "high" }
      : base.person,
    scheduledAt: edits.scheduledLabel?.trim()
      ? {
          label: edits.scheduledLabel.trim(),
          date: base.scheduledAt?.date ?? null,
          confidence: "high",
        }
      : base.scheduledAt,
    followUps:
      edits.followUpText != null
        ? edits.followUpText.trim()
          ? [{ text: edits.followUpText.trim(), confidence: "high" as const }]
          : []
        : base.followUps,
  };

  const fields = buildFields(next);
  return {
    ...next,
    fields,
    overallConfidence: overallConfidence(fields, next.ambiguities),
  };
}
