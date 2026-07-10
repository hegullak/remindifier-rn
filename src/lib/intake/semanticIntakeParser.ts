import type {
  IntakeConfidence,
  ScheduledAtOption,
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
  /\b(dinner|lunch|breakfast|brunch|coffee|drinks|party|meeting|visit|middag|lunsj|frokost|kaffe|besøk|fest|møte|mote)\b/i;

const FOLLOW_UP_CLAUSE_PATTERNS: {
  pattern: RegExp;
  talkingPointKind: "question" | "topic" | "headsup";
}[] = [
  { pattern: /\b(?:jeg\s+)?vil\s+også\s+ta\s+opp\s+at\s+(.+)/i, talkingPointKind: "question" },
  { pattern: /\bhusk\s+å\s+(.+?)(?=\s*[.!?]|\s+jeg\s+|$)/i, talkingPointKind: "question" },
  { pattern: /\bikke\s+glem\s+å\s+(.+?)(?=\s*[.!?]|\s+jeg\s+|$)/i, talkingPointKind: "question" },
  { pattern: /\bremember\s+to\s+(.+?)(?=\s*[.!?]|$)/i, talkingPointKind: "question" },
  { pattern: /\bdon'?t\s+forget\s+to\s+(.+?)(?=\s*[.!?]|$)/i, talkingPointKind: "question" },
  {
    pattern:
      /\b(?:vi\s+)?skal\s+diskutere\s+(.+?)(?=\s*[.!?]|$|\s+jeg\s+|\s+[A-ZÆØÅ][^.!?]*\s+nevnte)/i,
    talkingPointKind: "topic",
  },
  { pattern: /\bskal\s+snakke\s+om\s+(.+)/i, talkingPointKind: "topic" },
  {
    pattern: /\b(?:hun|han|de|sie|henne)\s+nevnte(?:\s+noe)?\s+om\s+(.+)/i,
    talkingPointKind: "topic",
  },
  { pattern: /\bnevnte\s+noe\s+om\s+(.+)/i, talkingPointKind: "topic" },
  {
    pattern: /\b(?:[A-ZÆØÅ][a-zæøå]+|[Hh]un|[Hh]an|[Dd]e)\s+nevnte\s+at\s+(.+)/i,
    talkingPointKind: "headsup",
  },
  { pattern: /\bnevnte\s+at\s+(.+)/i, talkingPointKind: "headsup" },
  { pattern: /\bask\s+(?:about|him|her|them)\s+(.+)/i, talkingPointKind: "question" },
  { pattern: /\b(?:remember|spør)\s+(?:to\s+)?(?:about|om)\s+(.+)/i, talkingPointKind: "question" },
];

const PERSON_WITH_PATTERN =
  /\b(?:with|med|hos|møte|mote)\s+([A-ZÆØÅ][a-zæøå]+(?:\s+og\s+[A-ZÆØÅ][a-zæøå]+)?)/;

const EVENING_CONTEXT = /\b(dinner|middag|evening|kveld|drinks|party|fest)\b/i;

const MAX_EVENT_TITLE_LEN = 55;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function capitalizePersonName(raw: string): string {
  return raw
    .split(/\s+/)
    .map((word) => (word.toLowerCase() === "og" ? "og" : capitalizeWord(word)))
    .join(" ");
}

function primaryEventKeyword(text: string): string | null {
  const matches = [...text.matchAll(new RegExp(EVENT_KEYWORDS.source, "gi"))];
  const specific = matches.filter((m) => !/^(møte|mote|meeting)$/i.test(m[0]));
  if (specific.length > 0) return specific[0][0];
  return matches[0]?.[0] ?? null;
}

function trimFollowUpTail(phrase: string): string {
  return normalizeWhitespace(
    phrase
      .replace(/\s+jeg\s+vil\s+også\b.*$/i, "")
      .replace(/\s+husk\s+å\b.*$/i, "")
      .replace(/\s*[.—–]\s+.*$/u, "")
      .replace(/\.\s+.*$/, "")
      .replace(/[,.]\s*$/, ""),
  );
}

function splitClauses(text: string): string[] {
  const clauses: string[] = [];
  const normalized = text.replace(/\r\n/g, "\n");
  for (const sentence of normalized.split(/(?<=[.!?])(?:\s+|\n+|$)/u)) {
    for (const piece of sentence.split(/\s*[—–]\s+/u)) {
      const trimmed = normalizeWhitespace(piece);
      if (trimmed.length > 0) clauses.push(trimmed);
    }
  }
  return clauses;
}

function pushFollowUp(
  list: {
    text: string;
    confidence: IntakeConfidence;
    talkingPointKind?: "question" | "topic" | "headsup";
  }[],
  text: string,
  talkingPointKind: "question" | "topic" | "headsup",
) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length < 3) return;
  if (list.some((f) => f.text.toLowerCase() === normalized.toLowerCase())) return;
  list.push({ text: normalized, confidence: "high", talkingPointKind });
}

function expandFollowUpCapture(
  raw: string,
  talkingPointKind: "question" | "topic" | "headsup",
): {
  text: string;
  talkingPointKind: "question" | "topic" | "headsup";
  confidence: IntakeConfidence;
}[] {
  const segments = raw
    .split(/\.\s+/)
    .map(trimFollowUpTail)
    .filter((s) => s.length >= 3);

  const items: {
    text: string;
    talkingPointKind: "question" | "topic" | "headsup";
    confidence: IntakeConfidence;
  }[] = [];
  for (const segment of segments.length > 0 ? segments : [trimFollowUpTail(raw)]) {
    const trimmedSegment = trimFollowUpTail(segment);
    if (talkingPointKind === "topic" && /\s+og\s+hvem\s+(?:som\s+)?/i.test(trimmedSegment)) {
      const parts = trimmedSegment.split(/\s+og\s+hvem\s+(?:som\s+)?/i);
      if (parts.length === 2 && parts[0].length >= 3 && parts[1].length >= 3) {
        items.push(
          { text: trimFollowUpTail(parts[0]), talkingPointKind, confidence: "high" },
          {
            text: trimFollowUpTail(`hvem som ${parts[1]}`),
            talkingPointKind,
            confidence: "high",
          },
        );
        continue;
      }
    }
    for (const part of splitFollowUpPhrase(trimmedSegment)) {
      if (part.length >= 3) items.push({ text: part, talkingPointKind, confidence: "high" });
    }
  }
  return items;
}

function splitFollowUpPhrase(phrase: string): string[] {
  const p = trimFollowUpTail(phrase);
  if (p.length < 3) return [];

  if (/\s+og\s+om\s+/i.test(p)) {
    const parts = p.split(/\s+og\s+om\s+/i);
    return parts
      .map((part, index) => {
        const trimmed = trimFollowUpTail(part);
        if (index === 0) return trimmed;
        if (/^(spør|spørre)\s/i.test(trimmed)) return trimmed;
        return `om ${trimmed}`;
      })
      .filter((s) => s.length >= 3);
  }

  if (/\s+og\s+(?=om\s|at\s|spør|spørre|gratul)/i.test(p)) {
    return p
      .split(/\s+og\s+/i)
      .map(trimFollowUpTail)
      .filter((s) => s.length >= 3);
  }

  return [p];
}

function stripFollowUpPhrases(clause: string): {
  followUps: ReturnType<typeof expandFollowUpCapture>;
  stripped: string;
} {
  const followUps: ReturnType<typeof expandFollowUpCapture> = [];
  let stripped = clause;

  for (const { pattern, talkingPointKind } of FOLLOW_UP_CLAUSE_PATTERNS) {
    const match = stripped.match(pattern);
    if (!match?.[1]) continue;
    for (const item of expandFollowUpCapture(match[1], talkingPointKind)) {
      if (!followUps.some((f) => f.text.toLowerCase() === item.text.toLowerCase())) {
        followUps.push(item);
      }
    }
    stripped = stripped.replace(pattern, " ");
  }

  stripped = normalizeWhitespace(
    stripped
      .replace(/\s*,\s*,/g, ",")
      .replace(/^[,.]\s*/, "")
      .replace(/\s*[,.]\s*$/, ""),
  );

  return { followUps, stripped };
}

function clauseIsAgendaTopic(clause: string): boolean {
  return /\b(?:skal\s+diskutere|diskutere|snakke\s+om)\b/i.test(clause);
}

function clauseHasSchedulingSignal(clause: string): boolean {
  return (
    EVENT_KEYWORDS.test(clause) ||
    new RegExp(`\\b(?:${WEEKDAY_PATTERN})\\b`, "i").test(clause) ||
    /\b(?:kl\.?|at|på)\s*(?:\d|one|two|three|four|five|six|en|to|tre|fire|fem|seks)/i.test(
      clause,
    ) ||
    PERSON_WITH_PATTERN.test(clause) ||
    /\b(?:planlegger|skal)\s+(?:å\s+)?(?:møte|mote|ta)\b/i.test(clause)
  );
}

function extractFollowUps(text: string): {
  followUps: ReturnType<typeof expandFollowUpCapture>;
  remainder: string;
} {
  const followUps: ReturnType<typeof expandFollowUpCapture> = [];
  const clauses = splitClauses(text);
  const remainderParts: string[] = [];

  for (const trimmed of clauses) {
    const { followUps: extracted, stripped } = stripFollowUpPhrases(trimmed);
    for (const item of extracted) {
      if (!followUps.some((f) => f.text.toLowerCase() === item.text.toLowerCase())) {
        followUps.push(item);
      }
    }

    if (extracted.length === 0 && clauseIsAgendaTopic(trimmed)) {
      const agenda = trimmed.match(/\b(?:vi\s+)?skal\s+diskutere\s+(.+?)(?=\s*[.!?]|$)/i)?.[1];
      if (agenda) {
        for (const item of expandFollowUpCapture(agenda, "topic")) {
          if (!followUps.some((f) => f.text.toLowerCase() === item.text.toLowerCase())) {
            followUps.push(item);
          }
        }
      } else {
        pushFollowUp(followUps, trimmed, "topic");
      }
      continue;
    }

    const schedulingSource = stripped || trimmed;
    if (stripped && clauseHasSchedulingSignal(stripped) && stripped.length >= 8) {
      remainderParts.push(stripped);
    } else if (!stripped && extracted.length > 0) {
    } else if (clauseHasSchedulingSignal(trimmed)) {
      remainderParts.push(schedulingSource);
    }
  }

  return {
    followUps,
    remainder: normalizeWhitespace(remainderParts.join(" ")),
  };
}

function extractPerson(text: string): { name: string | null; confidence: IntakeConfidence } {
  const match = text.match(PERSON_WITH_PATTERN);
  if (!match?.[1]) return { name: null, confidence: "low" };
  const parts = match[1].trim().split(/\s+/);
  if (parts.length === 2 && WEEKDAYS[parts[1].toLowerCase()] != null) {
    return { name: capitalizeWord(parts[0]), confidence: "high" };
  }
  const name = normalizeWhitespace(capitalizePersonName(match[1].trim()));
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
      `\\b((?:dinner|lunch|breakfast|brunch|coffee|drinks|party|meeting|visit|middag|lunsj|frokost|kaffe|besøk|fest|møte|mote)\\s+(?:with|med|hos)\\s+[A-ZÆØÅ][a-zæøå]+(?:\\s+og\\s+[A-ZÆØÅ][a-zæøå]+)?)(?=\\s+(?:${WEEKDAY_PATTERN})\\b|[,.]|\\s+(?:at|kl\\.?|på)|$)`,
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

  const meetMatch = trimmed.match(
    /\b(?:møte|mote|meet)\s+([A-ZÆØÅ][a-zæøå]+(?:\s+og\s+[A-ZÆØÅ][a-zæøå]+)?)/i,
  );
  const keyword = primaryEventKeyword(trimmed);
  if (keyword && (personName || meetMatch?.[1])) {
    const who = personName ?? capitalizePersonName(meetMatch?.[1] ?? "");
    const kw = capitalizeWord(keyword);
    const title =
      kw.toLowerCase() === "møte" || kw.toLowerCase() === "mote"
        ? `Møte med ${who}`
        : `${kw} med ${who}`;
    return { title, confidence: "high" };
  }

  if (personName && primaryEventKeyword(trimmed)) {
    const kw = primaryEventKeyword(trimmed) ?? "Meeting";
    return {
      title: `${capitalizeWord(kw)} med ${personName}`,
      confidence: "medium",
    };
  }

  const firstClause = trimmed.split(/[,;]/)[0]?.trim();
  if (
    firstClause &&
    EVENT_KEYWORDS.test(firstClause) &&
    firstClause.length <= MAX_EVENT_TITLE_LEN &&
    !firstClause.includes(".")
  ) {
    return { title: capitalizeWord(firstClause), confidence: "medium" };
  }

  if (personName) {
    return { title: `Møte med ${personName}`, confidence: "low" };
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

function parseClockFromFragment(
  fragment: string,
  eveningBias: boolean,
): { hour: number; minute: number } | null {
  const slice = fragment.slice(0, 48);
  const lower = slice.toLowerCase();
  const clockMatch =
    lower.match(/\b(?:klokken|kl\.?|at|ca\.?|på)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i) ??
    lower.match(
      /\b(?:klokken|kl\.?|at|ca\.?|på)\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|en|tre|fire|fem|seks|syv|sju|åtte|ni|ti|elleve|tolv)\b/i,
    ) ??
    lower.match(/\b(\d{1,2}):(\d{2})\b/);

  if (!clockMatch) return null;

  let hour: number | null = null;
  let minute = 0;

  if (clockMatch[2] != null && /^\d{2}$/.test(clockMatch[2]) && clockMatch[0].includes(":")) {
    hour = Number.parseInt(clockMatch[1], 10);
    minute = Number.parseInt(clockMatch[2], 10);
  } else {
    hour = parseHourToken(clockMatch[1], clockMatch[3], eveningBias);
    if (clockMatch[2] && /^\d{2}$/.test(clockMatch[2])) {
      minute = Number.parseInt(clockMatch[2], 10);
    }
  }

  if (hour == null || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function buildScheduledAtOption(
  weekdayIndex: number,
  weekdayLabel: string,
  hour: number | null,
  minute: number,
  referenceDate: Date,
  locale: "en" | "no",
): ScheduledAtOption {
  const target = new Date(referenceDate);
  target.setHours(0, 0, 0, 0);
  const delta = (weekdayIndex - target.getDay() + 7) % 7;
  target.setDate(target.getDate() + delta);
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

  const parts: string[] = [weekdayLabel];
  if (timeLabel) parts.push(timeLabel);

  const confidence: IntakeConfidence = hour != null ? "high" : "medium";

  return {
    label: parts.join(" "),
    date: target,
    confidence,
  };
}

function extractAllDateTimes(
  text: string,
  referenceDate: Date,
  locale: "en" | "no",
): ScheduledAtOption[] {
  const eveningBias = EVENING_CONTEXT.test(text);
  const seen = new Set<string>();
  const options: ScheduledAtOption[] = [];

  for (const [name, weekdayIndex] of Object.entries(WEEKDAYS)) {
    const pattern = new RegExp(`\\b${name}\\b`, "gi");
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match != null) {
      const fragment = text.slice(match.index);
      const clock = parseClockFromFragment(fragment, eveningBias);
      const weekdayLabel = capitalizeWord(name);
      const option = buildScheduledAtOption(
        weekdayIndex,
        weekdayLabel,
        clock?.hour ?? null,
        clock?.minute ?? 0,
        referenceDate,
        locale,
      );
      const key = `${weekdayIndex}-${clock?.hour ?? "x"}-${clock?.minute ?? 0}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push(option);
      }
      match = pattern.exec(text);
    }
  }

  return options.sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
}

function resolveScheduledAt(
  text: string,
  referenceDate: Date,
  locale: "en" | "no",
): {
  scheduledAt: ScheduledAtOption | null;
  scheduledAtOptions?: ScheduledAtOption[];
} {
  const options = extractAllDateTimes(text, referenceDate, locale);

  if (options.length >= 2) {
    const distinctTimes = new Set(
      options.map((o) => `${o.date?.getDay()}-${o.date?.getHours()}-${o.date?.getMinutes()}`),
    );
    if (distinctTimes.size >= 2) {
      return { scheduledAt: null, scheduledAtOptions: options };
    }
  }

  if (options.length === 1) {
    return { scheduledAt: options[0] };
  }

  const fallback = extractDateTimeFallback(text, referenceDate, locale);
  return { scheduledAt: fallback };
}

function extractDateTimeFallback(
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
      /\b(?:at|kl\.?|ca\.?|på)\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|en|to|tre|fire|fem|seks|syv|sju|åtte|ni|ti|elleve|tolv)(?::(\d{2}))?\s*(am|pm)?\b/i,
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
    const delta = (weekday - current + 7) % 7;
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

export function buildFields(
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

export function overallConfidence(
  fields: SemanticIntakeField[],
  ambiguities: string[],
): IntakeConfidence {
  if (fields.length === 0) return "low";
  if (ambiguities.includes("free_form_only")) return "low";
  if (ambiguities.length > 0) return "medium";
  const lows = fields.filter((f) => f.confidence === "low").length;
  if (lows > 0) return "medium";
  return "high";
}

export function parseSemanticIntakeLocal(
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
  const { scheduledAt, scheduledAtOptions } = resolveScheduledAt(rawText, referenceDate, locale);

  const ambiguities: string[] = [];
  if (!eventExtract.title && !personExtract.name) {
    ambiguities.push("no_event_or_person");
  }
  if (personExtract.name && !PERSON_WITH_PATTERN.test(rawText)) {
    ambiguities.push("person_unclear");
  }
  if (scheduledAtOptions && scheduledAtOptions.length >= 2) {
    ambiguities.push("datetime_conflict");
  } else if (scheduledAt?.confidence === "medium") {
    ambiguities.push("datetime_partial");
  }
  if (followUpTexts.length === 0 && /\b(remember|husk|ask|spør|nevnte)\b/i.test(rawText)) {
    ambiguities.push("follow_up_unclear");
  }

  const followUps = followUpTexts.map((item) => ({
    text: item.text,
    confidence: "high" as const,
    talkingPointKind: item.talkingPointKind,
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
    scheduledAtOptions,
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
    followUps:
      edits.followUpText != null
        ? edits.followUpText
            .trim()
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((text) => ({
              text,
              confidence: "high" as const,
              talkingPointKind: "question" as const,
            }))
        : base.followUps,
  };

  if (edits.scheduledLabel != null) {
    const label = edits.scheduledLabel.trim();
    const matchedOption = base.scheduledAtOptions?.find((o) => o.label === label);
    next.scheduledAt = label
      ? {
          label,
          date: matchedOption?.date ?? base.scheduledAt?.date ?? null,
          confidence: "high",
        }
      : base.scheduledAt;
    if (label && base.ambiguities.includes("datetime_conflict")) {
      next.ambiguities = base.ambiguities.filter((a) => a !== "datetime_conflict");
    }
  }

  const fields = buildFields(next);
  return {
    ...next,
    fields,
    overallConfidence: overallConfidence(fields, next.ambiguities),
  };
}
