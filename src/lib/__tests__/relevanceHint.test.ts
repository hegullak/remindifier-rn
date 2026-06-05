import { buildPersonRelevanceHint } from "@/lib/people/relevanceHint";

describe("buildPersonRelevanceHint", () => {
  it("prioritizes gathering within 7 days", () => {
    const hint = buildPersonRelevanceHint(
      {
        nextGatheringTitle: "Middag hos Ida",
        nextGatheringDaysUntil: 2,
        nextRedLetterDayLabel: "Bursdag",
        nextRedLetterDaysUntil: 1,
        firstFollowUpBody: "Spør om jobben",
      },
      "no",
    );
    expect(hint).toContain("Middag hos Ida");
    expect(hint).toMatch(/2 dager|Om 2 dager/i);
  });

  it("uses red-letter day when no nearby gathering", () => {
    const hint = buildPersonRelevanceHint(
      {
        nextGatheringTitle: null,
        nextGatheringDaysUntil: null,
        nextRedLetterDayLabel: "Bursdag",
        nextRedLetterDaysUntil: 0,
        firstFollowUpBody: null,
      },
      "no",
    );
    expect(hint).toContain("Bursdag");
    expect(hint).toMatch(/I dag/i);
  });

  it("uses follow-up when no calendar signals", () => {
    const hint = buildPersonRelevanceHint(
      {
        nextGatheringTitle: null,
        nextGatheringDaysUntil: null,
        nextRedLetterDayLabel: null,
        nextRedLetterDaysUntil: null,
        firstFollowUpBody: "Husk å gratulere med ny jobb",
      },
      "en",
    );
    expect(hint).toBe("Husk å gratulere med ny jobb");
  });

  it("truncates long follow-up notes", () => {
    const long = "A".repeat(60);
    const hint = buildPersonRelevanceHint(
      {
        nextGatheringTitle: null,
        nextGatheringDaysUntil: null,
        nextRedLetterDayLabel: null,
        nextRedLetterDaysUntil: null,
        firstFollowUpBody: long,
      },
      "en",
    );
    expect(hint).toHaveLength(50);
    expect(hint?.endsWith("...")).toBe(true);
  });

  it("returns null when nothing is relevant", () => {
    expect(
      buildPersonRelevanceHint(
        {
          nextGatheringTitle: "Old event",
          nextGatheringDaysUntil: 14,
          nextRedLetterDayLabel: null,
          nextRedLetterDaysUntil: null,
          firstFollowUpBody: null,
        },
        "no",
      ),
    ).toBeNull();
  });

  it("formats tomorrow in English", () => {
    const hint = buildPersonRelevanceHint(
      {
        nextGatheringTitle: "Dinner",
        nextGatheringDaysUntil: 1,
        nextRedLetterDayLabel: null,
        nextRedLetterDaysUntil: null,
        firstFollowUpBody: null,
      },
      "en",
    );
    expect(hint).toMatch(/tomorrow/i);
  });
});
