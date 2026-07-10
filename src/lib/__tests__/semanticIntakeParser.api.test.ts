import {
  enrichIntakeWithLocalSchedule,
  normalizeIntakeApiPayload,
} from "@/lib/intake/semanticIntakeParser.api";

const WEDNESDAY = new Date("2026-05-27T12:00:00");

describe("normalizeIntakeApiPayload", () => {
  it("adds datetime_conflict when API returns two schedule options", () => {
    const result = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj med Marte og Jonas",
        personName: "Marte og Jonas",
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [
          { label: "Onsdag 12:00", scheduledAtIso: null },
          { label: "Torsdag 13:00", scheduledAtIso: null },
        ],
        followUps: [{ text: "Diskutere hyttetur", kind: "topic" }],
        ambiguities: [],
        freeFormNote: null,
      },
      "raw",
      WEDNESDAY,
      "no",
    );

    expect(result?.ambiguities).toContain("datetime_conflict");
    expect(result?.scheduledAt).toBeNull();
    expect(result?.scheduledAtOptions).toHaveLength(2);
  });

  it("merges orphan husk å gratulere with engagement line", () => {
    const result = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj",
        personName: null,
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [],
        followUps: [
          { text: "Marte og Per gifter seg til sommeren", kind: "headsup" },
          { text: "husk å gratulere", kind: "question" },
        ],
        ambiguities: [],
        freeFormNote: null,
      },
      "raw",
      WEDNESDAY,
      "no",
    );

    expect(result?.followUps).toHaveLength(1);
    expect(result?.followUps[0]?.text).toMatch(/gifter seg/i);
    expect(result?.followUps[0]?.text).toMatch(/gratulere/i);
  });

  it("tags diskutere hyttetur as topic not question", () => {
    const result = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj",
        personName: null,
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [],
        followUps: [{ text: "diskutere hyttetur i påsken", kind: "question" }],
        ambiguities: [],
        freeFormNote: null,
      },
      "raw",
      WEDNESDAY,
      "no",
    );
    expect(result?.followUps[0]?.talkingPointKind).toBe("topic");
  });

  it("drops garbled mashup follow-ups", () => {
    const result = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj",
        personName: null,
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [],
        followUps: [
          { text: "diskutere hyttetur i påsken", kind: "topic" },
          {
            text: "hvem som tar med hva Martin henter at hun og Per gifter seg til sommeren",
            kind: "question",
          },
          { text: "Husk å gratulere — hun og Per gifter seg til sommeren", kind: "headsup" },
        ],
        ambiguities: [],
        freeFormNote: null,
      },
      "raw",
      WEDNESDAY,
      "no",
    );
    expect(
      result?.followUps.some(
        (f) => /\btar med hva\b/i.test(f.text) && /\bgifter seg\b/i.test(f.text),
      ),
    ).toBe(false);
  });

  it("merges gratulere when it appears before the engagement line", () => {
    const result = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj",
        personName: null,
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [],
        followUps: [
          { text: "Jonas skylder meg 500 kr", kind: "headsup" },
          { text: "gratulere", kind: "question" },
          { text: "hyttetur", kind: "topic" },
          { text: "hun og Per gifter seg til sommeren", kind: "headsup" },
        ],
        ambiguities: [],
        freeFormNote: null,
      },
      "raw",
      WEDNESDAY,
      "no",
    );

    expect(result?.followUps.some((f) => isGratulereOnly(f.text))).toBe(false);
    expect(
      result?.followUps.some((f) => /gifter seg/i.test(f.text) && /gratulere/i.test(f.text)),
    ).toBe(true);
    expect(result?.followUps).toHaveLength(3);
  });
});

function isGratulereOnly(text: string): boolean {
  return /^(husk å\s+)?gratulere\.?$/i.test(text.trim());
}

const MARTE_JONAS_INPUT =
  "Planlegger å møte Marte og Jonas til lunsj onsdag kl. 12, men Jonas kan ikke før torsdag kl. 13. Vi skal diskutere hyttetur i påsken og hvem som tar med hva. Marte nevnte at hun og Per gifter seg til sommeren — husk å gratulere. Jeg vil også ta opp at Jonas skylder meg 500 kr fra sist.";

describe("enrichIntakeWithLocalSchedule", () => {
  it("adds agenda topics from local parser when API omits hyttetur", () => {
    const apiOnly = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj med Marte og Jonas",
        personName: "Marte og Jonas",
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [
          { label: "Onsdag 12:00", scheduledAtIso: null },
          { label: "Torsdag 13:00", scheduledAtIso: null },
        ],
        followUps: [
          { text: "Jonas skylder meg 500 kr fra sist", kind: "headsup" },
          {
            text: "hun og Per gifter seg til sommeren — husk å gratulere",
            kind: "headsup",
          },
        ],
        ambiguities: [],
        freeFormNote: null,
      },
      MARTE_JONAS_INPUT,
      WEDNESDAY,
      "no",
    );
    expect(apiOnly).not.toBeNull();
    expect(apiOnly?.followUps.some((f) => /hyttetur/i.test(f.text))).toBe(false);

    const enriched = enrichIntakeWithLocalSchedule(apiOnly!, MARTE_JONAS_INPUT, WEDNESDAY, "no");

    expect(enriched.followUps.some((f) => /hyttetur/i.test(f.text))).toBe(true);
    expect(enriched.followUps.some((f) => /tar med hva|hvem som/i.test(f.text))).toBe(true);
  });

  it("fills schedule options from local parser when API omits them", () => {
    const apiOnly = normalizeIntakeApiPayload(
      {
        eventTitle: "Lunsj med Marte og Jonas",
        personName: null,
        scheduledAtLabel: null,
        scheduledAtIso: null,
        scheduledAtOptions: [],
        followUps: [],
        ambiguities: [],
        freeFormNote: null,
      },
      "Planlegger å møte Marte og Jonas til lunsj onsdag kl. 12, men Jonas kan ikke før torsdag kl. 13.",
      WEDNESDAY,
      "no",
    );
    expect(apiOnly).not.toBeNull();

    const enriched = enrichIntakeWithLocalSchedule(
      apiOnly!,
      "Planlegger å møte Marte og Jonas til lunsj onsdag kl. 12, men Jonas kan ikke før torsdag kl. 13.",
      WEDNESDAY,
      "no",
    );

    expect(enriched.ambiguities).toContain("datetime_conflict");
    expect(enriched.scheduledAtOptions?.length).toBeGreaterThanOrEqual(2);
    expect(enriched.scheduledAtOptions?.[0]?.date).not.toBeNull();
  });
});
