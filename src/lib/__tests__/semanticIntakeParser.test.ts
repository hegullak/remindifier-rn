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
    expect(result.event?.title).toMatch(/Lunch with Anna/i);
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
});
