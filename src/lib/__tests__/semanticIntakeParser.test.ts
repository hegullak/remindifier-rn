import { applySemanticIntakeEdits, parseSemanticIntake } from "@/lib/intake/semanticIntakeParser";

const WEDNESDAY = new Date("2026-05-27T12:00:00");

describe("parseSemanticIntake", () => {
  it("detects event, person, datetime, and follow-up from natural English", () => {
    const result = parseSemanticIntake(
      "Dinner with Kenneth Friday at six, remember to ask about the new job.",
      { referenceDate: WEDNESDAY, locale: "en" },
    );

    expect(result.event?.title).toBe("Dinner with Kenneth");
    expect(result.person?.name).toBe("Kenneth");
    expect(result.scheduledAt?.label).toMatch(/Friday/i);
    expect(result.scheduledAt?.label).toMatch(/18:00|6:00 PM|06:00 PM/i);
    expect(result.followUps[0]?.text).toBe("ask about the new job");
    expect(result.overallConfidence).not.toBe("low");
  });

  it("detects person from with-pattern", () => {
    const result = parseSemanticIntake("Lunch with Anna tomorrow", {
      referenceDate: WEDNESDAY,
      locale: "en",
    });
    expect(result.person?.name).toBe("Anna");
    expect(result.event?.title).toMatch(/Lunch med Anna/i);
  });

  it("detects Norwegian follow-up phrasing", () => {
    const result = parseSemanticIntake("Middag med Ola fredag kl 19, husk å spørre om hunden", {
      referenceDate: WEDNESDAY,
      locale: "no",
    });
    expect(result.person?.name).toBe("Ola");
    expect(result.followUps[0]?.text).toMatch(/hunden/i);
    expect(result.scheduledAt?.label).toMatch(/fredag/i);
  });

  it("marks ambiguous free-form input", () => {
    const result = parseSemanticIntake("maybe something later", {
      referenceDate: WEDNESDAY,
      locale: "en",
    });
    expect(result.freeFormNote).toBe("maybe something later");
    expect(result.ambiguities).toContain("free_form_only");
    expect(result.ambiguities).toContain("no_event_or_person");
    expect(result.overallConfidence).toBe("low");
  });

  it("falls back gracefully on blank input", () => {
    const result = parseSemanticIntake("   ", { referenceDate: WEDNESDAY });
    expect(result.fields).toEqual([]);
    expect(result.event).toBeNull();
    expect(result.person).toBeNull();
    expect(result.followUps).toEqual([]);
  });

  it("applies manual edits for confirmation preview", () => {
    const parsed = parseSemanticIntake("Dinner with Kenneth Friday at six", {
      referenceDate: WEDNESDAY,
      locale: "en",
    });
    const edited = applySemanticIntakeEdits(parsed, {
      eventTitle: "Dinner with Kenneth and Ida",
      followUpText: "ask about the new job",
    });
    expect(edited.event?.title).toBe("Dinner with Kenneth and Ida");
    expect(edited.followUps[0]?.text).toBe("ask about the new job");
    expect(edited.fields.some((f) => f.kind === "follow_up")).toBe(true);
  });

  it("parses numeric clock times", () => {
    const result = parseSemanticIntake("Meeting with Sara on Friday at 19:30", {
      referenceDate: WEDNESDAY,
      locale: "en",
    });
    expect(result.scheduledAt?.label).toMatch(/Friday/i);
    expect(result.scheduledAt?.date?.getHours()).toBe(19);
    expect(result.scheduledAt?.date?.getMinutes()).toBe(30);
  });

  it("splits multiple Norwegian follow-ups from one reminder", () => {
    const result = parseSemanticIntake(
      "Middag med Kristoffer fredag kl. 19. Han byttet jobb i januar og jeg har ikke snakket med ham siden. Husk å spørre om den nye stillingen og om han fortsatt løper.",
      { referenceDate: WEDNESDAY, locale: "no" },
    );
    expect(result.event?.title).toBe("Middag med Kristoffer");
    expect(result.person?.name).toBe("Kristoffer");
    expect(result.followUps).toHaveLength(2);
    expect(result.followUps[0]?.text).toMatch(/nye stillingen/i);
    expect(result.followUps[1]?.text).toMatch(/fortsatt løper/i);
  });

  it("picks up indirect follow-up from a later sentence", () => {
    const result = parseSemanticIntake(
      "Skal ta en kaffe med Sara på tirsdag. Ingenting spesielt, bare det har gått for lenge. Hun nevnte noe om å flytte i vår.",
      { referenceDate: WEDNESDAY, locale: "no" },
    );
    expect(result.person?.name).toBe("Sara");
    expect(result.event?.title).toMatch(/Kaffe med Sara/i);
    expect(result.scheduledAt?.label).toMatch(/tirsdag/i);
    expect(result.followUps.some((f) => /flytte/i.test(f.text))).toBe(true);
  });

  it("extracts several follow-ups from a complex lunch plan", () => {
    const result = parseSemanticIntake(
      "Planlegger å møte Marte og Jonas til lunsj onsdag kl. 12, men Jonas kan ikke før torsdag kl. 13. Vi skal diskutere hyttetur i påsken og hvem som tar med hva. Marte nevnte at hun og Per gifter seg til sommeren — husk å gratulere. Jeg vil også ta opp at Jonas skylder meg 500 kr fra sist.",
      { referenceDate: WEDNESDAY, locale: "no" },
    );
    expect(result.event?.title).toMatch(/Lunsj med Marte og Jonas/i);
    expect(result.person?.name).toBe("Marte og Jonas");
    expect(result.followUps.length).toBeGreaterThanOrEqual(2);
    expect(result.followUps.some((f) => /gratul/i.test(f.text))).toBe(true);
    expect(result.followUps.some((f) => /gifter seg|Per/i.test(f.text))).toBe(true);
    expect(result.followUps.some((f) => /skylder|500/i.test(f.text))).toBe(true);
    expect(result.event?.title?.length ?? 0).toBeLessThanOrEqual(55);
  });

  it("splits edited follow-up text into multiple items", () => {
    const parsed = parseSemanticIntake("Middag med Ola fredag", {
      referenceDate: WEDNESDAY,
      locale: "no",
    });
    const edited = applySemanticIntakeEdits(parsed, {
      followUpText: "spørre om den nye stillingen\nom han fortsatt løper",
    });
    expect(edited.followUps).toHaveLength(2);
  });
});
