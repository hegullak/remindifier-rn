import { parseNaturalPersonInput } from "@/lib/people/naturalLanguageParser";

describe("parseNaturalPersonInput", () => {
  it("parses Norwegian example with name, relation, birthday, and fun fact", () => {
    const result = parseNaturalPersonInput(
      "Trine er søsteren min, bursdag 14. mars, liker ikke sene samtaler",
    );
    expect(result.displayName).toBe("Trine");
    expect(result.relationType).toBe("søster");
    expect(result.birthday).toBe("0001-03-14");
    expect(result.birthdayYearKnown).toBe(false);
    expect(result.funFacts.some((f) => f.includes("sene samtaler"))).toBe(true);
    expect(result.rawInput).toContain("Trine");
  });

  it("parses English relation and birthday", () => {
    const result = parseNaturalPersonInput(
      "Anna is my sister, birthday March 14, prefers morning calls",
    );
    expect(result.displayName).toBe("Anna");
    expect(result.relationType).toBe("sister");
    expect(result.birthday).toBe("0001-03-14");
    expect(result.birthdayYearKnown).toBe(false);
    expect(result.funFacts.length).toBeGreaterThan(0);
  });

  it("parses ISO birthday with year", () => {
    const result = parseNaturalPersonInput("Jonas, colleague, born 1990-03-14");
    expect(result.displayName).toBe("Jonas");
    expect(result.relationType).toBe("colleague");
    expect(result.birthday).toBe("1990-03-14");
    expect(result.birthdayYearKnown).toBe(true);
  });

  it("parses named pattern in English", () => {
    const result = parseNaturalPersonInput("Named Erik, friend, loves cycling");
    expect(result.displayName).toBe("Erik");
    expect(result.relationType).toBe("friend");
    expect(result.funFacts.some((f) => /cycling/i.test(f))).toBe(true);
  });

  it("handles name only", () => {
    const result = parseNaturalPersonInput("Helga");
    expect(result.displayName).toBe("Helga");
    expect(result.relationType).toBeNull();
    expect(result.birthday).toBeNull();
    expect(result.funFacts).toEqual([]);
  });

  it("handles missing name but keeps fun facts", () => {
    const result = parseNaturalPersonInput("kollega, bursdag 5. juni, elsker kaffe");
    expect(result.displayName).toBeNull();
    expect(result.relationType).toBe("kollega");
    expect(result.birthday).toBe("0001-06-05");
    expect(result.funFacts.length).toBeGreaterThan(0);
  });

  it("parses multiple fun facts separated by commas", () => {
    const result = parseNaturalPersonInput(
      "Per er venn, bursdag 2. januar, spiller gitar, bor i Bergen",
    );
    expect(result.displayName).toBe("Per");
    expect(result.funFacts.length).toBeGreaterThanOrEqual(2);
  });

  it("parses numeric date with year", () => {
    const result = parseNaturalPersonInput("Lisa, sister, 14/3/1988");
    expect(result.birthday).toBe("1988-03-14");
    expect(result.birthdayYearKnown).toBe(true);
  });

  it("returns empty draft for blank input", () => {
    const result = parseNaturalPersonInput("   ");
    expect(result.displayName).toBeNull();
    expect(result.funFacts).toEqual([]);
    expect(result.rawInput).toBe("");
  });

  it("parses birthday hint prefix without leading name", () => {
    const result = parseNaturalPersonInput("bursdag 14 mars");
    expect(result.birthday).toBe("0001-03-14");
    expect(result.birthdayYearKnown).toBe(false);
  });

  it("parses Norwegian memory fragments with month-only birthday", () => {
    const result = parseNaturalPersonInput(
      "Trine. Søsteren min. Bursdag i mars. Liker ikke sene samtaler.",
    );
    expect(result.displayName).toBe("Trine");
    expect(result.relationType).toBe("søster");
    expect(result.birthday).toBe("0001-03-01");
    expect(result.birthdayYearKnown).toBe(false);
    expect(result.funFacts).toContain("Liker ikke sene samtaler");
  });

  it("parses English month-only birthday", () => {
    const result = parseNaturalPersonInput("Alex. Friend. Birthday in March. Football parent.");
    expect(result.displayName).toBe("Alex");
    expect(result.relationType).toBe("friend");
    expect(result.birthday).toBe("0001-03-01");
    expect(result.funFacts).toContain("Football parent");
  });

  it("keeps unmapped memory fragments as-is", () => {
    const result = parseNaturalPersonInput("Maya. football parent");
    expect(result.displayName).toBe("Maya");
    expect(result.funFacts).toContain("football parent");
  });
});
