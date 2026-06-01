export type ParseMode = "event" | "intake" | "person";

export const EVENT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { anyOf: [{ type: "string" }, { type: "null" }] },
    talkingPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["question", "topic", "smalltalk", "headsup"],
          },
          text: { type: "string" },
        },
        required: ["kind", "text"],
        additionalProperties: false,
      },
    },
    mentionedPeople: { type: "array", items: { type: "string" } },
  },
  required: ["title", "talkingPoints", "mentionedPeople"],
  additionalProperties: false,
} as const;

export const INTAKE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    eventTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
    personName: { anyOf: [{ type: "string" }, { type: "null" }] },
    scheduledAtLabel: { anyOf: [{ type: "string" }, { type: "null" }] },
    scheduledAtIso: { anyOf: [{ type: "string" }, { type: "null" }] },
    scheduledAtOptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          scheduledAtIso: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["label", "scheduledAtIso"],
        additionalProperties: false,
      },
    },
    followUps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: {
            type: "string",
            enum: ["question", "topic", "smalltalk", "headsup"],
          },
        },
        required: ["text", "kind"],
        additionalProperties: false,
      },
    },
    ambiguities: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "no_event_or_person",
          "person_unclear",
          "datetime_partial",
          "datetime_conflict",
          "follow_up_unclear",
          "free_form_only",
        ],
      },
    },
    freeFormNote: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [
    "eventTitle",
    "personName",
    "scheduledAtLabel",
    "scheduledAtIso",
    "scheduledAtOptions",
    "followUps",
    "ambiguities",
    "freeFormNote",
  ],
  additionalProperties: false,
} as const;

export const PERSON_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    displayName: { anyOf: [{ type: "string" }, { type: "null" }] },
    relationType: { anyOf: [{ type: "string" }, { type: "null" }] },
    birthday: { anyOf: [{ type: "string" }, { type: "null" }] },
    birthdayYearKnown: { type: "boolean" },
    funFacts: { type: "array", items: { type: "string" } },
    pendingActions: { type: "array", items: { type: "string" } },
  },
  required: [
    "displayName",
    "relationType",
    "birthday",
    "birthdayYearKnown",
    "funFacts",
    "pendingActions",
  ],
  additionalProperties: false,
} as const;

const EVENT_SYSTEM_PROMPT = `You extract structured fields from a note about an upcoming social event or gathering.

title: a short event title (3-6 words). Infer from context if not stated explicitly.
talkingPoints: classify each item the user wants to do, discuss, ask or remember:
  - question: something to ask the other person
  - topic: something to discuss or bring up
  - smalltalk: a light conversation topic, icebreaker or shared interest
  - headsup: something to remember, prepare for, watch for, or plan ahead of the meeting
mentionedPeople: first names or full names of people mentioned (not the user themselves).
Do not invent items not in the text. Return ONLY valid JSON. No markdown.`;

const INTAKE_SYSTEM_PROMPT = `You extract structured fields from free-text the user spoke or typed about a social plan (Norwegian or English).

eventTitle: short social title only (e.g. "Lunsj med Marte og Jonas") — NOT the meeting agenda. null if unclear.
personName: main person(s) involved, as written. null if none.
scheduledAtLabel: human-readable date/time in user's language (e.g. "Torsdag 13:00"). null if none.
scheduledAtIso: ISO 8601 datetime when unambiguous; null if unknown or conflicting.
scheduledAtOptions: when TWO different times are mentioned (e.g. Wednesday 12 vs Thursday 13), list each option with label and optional ISO. Empty array if only one time.
followUps: MUST include the main meeting agenda when the user says "vi skal diskutere …" / "diskutere …" / "snakke om …" — each as kind "topic" (e.g. "hyttetur i påsken", "hvem som tar med hva"). Also add reminders, news, and action items. Keep "husk å …" on the same line as the fact it refers to (e.g. "Husk å gratulere — hun og Per gifter seg til sommeren"). Use kinds: question, topic, smalltalk, headsup.
ambiguities: use keys: no_event_or_person, person_unclear, datetime_partial, datetime_conflict, follow_up_unclear, free_form_only (only when appropriate).
freeFormNote: full text only when nothing else fits; else null.
Do not invent facts. Return ONLY valid JSON.`;

function buildPersonSystemPrompt(todayIso: string): string {
  return `You extract structured fields about ONE person from free-text memory fragments written by the user about someone they know.

Rules:
- displayName: the name of the person being described (the first/main person mentioned)
- relationType: how this person relates TO THE WRITER — e.g. "beste venn", "bror", "kollega". NOT roles the person has in their own life.
- birthday: ISO YYYY-MM-DD when year is known; 0001-MM-DD when year unknown; 0001-MM-01 if only month known; null if no date found
- birthdayYearKnown: true only when you have a specific birth year
- funFacts: permanent memory fragments. One idea per item, under 15 words.
- pendingActions: things the user intends to do or ask. Under 15 words each. Empty array if none.
- do not invent facts not in the text

Today's date: ${todayIso}`;
}

export function schemaForMode(mode: ParseMode) {
  switch (mode) {
    case "event":
      return { name: "event_draft", schema: EVENT_RESPONSE_SCHEMA, system: EVENT_SYSTEM_PROMPT };
    case "intake":
      return { name: "intake_draft", schema: INTAKE_RESPONSE_SCHEMA, system: INTAKE_SYSTEM_PROMPT };
    case "person":
      return {
        name: "person_draft",
        schema: PERSON_RESPONSE_SCHEMA,
        system: buildPersonSystemPrompt(new Date().toISOString().slice(0, 10)),
      };
  }
}
