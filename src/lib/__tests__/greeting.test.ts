import { briefGreetingLine, dayPeriod } from "@/lib/brief/greeting";

function dateAt(hour: number): Date {
  const d = new Date(2024, 0, 15);
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe("dayPeriod", () => {
  it("returns morning for midnight", () => expect(dayPeriod(dateAt(0))).toBe("morning"));
  it("returns morning for 11:59", () => expect(dayPeriod(dateAt(11))).toBe("morning"));
  it("returns afternoon for noon", () => expect(dayPeriod(dateAt(12))).toBe("afternoon"));
  it("returns afternoon for 16:59", () => expect(dayPeriod(dateAt(16))).toBe("afternoon"));
  it("returns evening for 17:00", () => expect(dayPeriod(dateAt(17))).toBe("evening"));
  it("returns evening for 23:00", () => expect(dayPeriod(dateAt(23))).toBe("evening"));
});

describe("briefGreetingLine", () => {
  it("includes the first name in name part", () => {
    expect(briefGreetingLine("Helga", "en", dateAt(8)).name).toContain("Helga");
  });

  it("trims whitespace from name", () => {
    expect(briefGreetingLine("  Henning  ", "en", dateAt(8)).name).toContain("Henning");
  });

  it('falls back to "there" for empty name in English', () => {
    expect(briefGreetingLine("", "en", dateAt(8)).name).toContain("there");
  });

  it('falls back to "du" for empty name in Norwegian', () => {
    expect(briefGreetingLine("", "no", dateAt(8)).name).toContain("du");
  });

  it("includes Good morning in the morning", () => {
    expect(briefGreetingLine("Ida", "en", dateAt(9)).lead).toContain("Good morning");
  });

  it("includes Good afternoon in the afternoon", () => {
    expect(briefGreetingLine("Ida", "en", dateAt(14)).lead).toContain("Good afternoon");
  });

  it("includes Good evening in the evening", () => {
    expect(briefGreetingLine("Ida", "en", dateAt(20)).lead).toContain("Good evening");
  });

  it("includes God morgen in Norwegian morning", () => {
    expect(briefGreetingLine("Ida", "no", dateAt(9)).lead).toContain("God morgen");
  });

  it("lead ends with comma", () => {
    expect(briefGreetingLine("Ida", "en", dateAt(9)).lead).toMatch(/,$/);
  });

  it("name ends with period", () => {
    expect(briefGreetingLine("Ida", "en", dateAt(9)).name).toMatch(/\.$/);
  });
});
