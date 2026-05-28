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
  it("includes the first name", () => {
    expect(briefGreetingLine("Helga", dateAt(8))).toContain("Helga");
  });

  it("trims whitespace from name", () => {
    expect(briefGreetingLine("  Henning  ", dateAt(8))).toContain("Henning");
  });

  it('falls back to "there" for empty name', () => {
    expect(briefGreetingLine("", dateAt(8))).toContain("there");
  });

  it('falls back to "there" for whitespace-only name', () => {
    expect(briefGreetingLine("   ", dateAt(8))).toContain("there");
  });

  it("includes Good morning in the morning", () => {
    expect(briefGreetingLine("Ida", dateAt(9))).toContain("Good morning");
  });

  it("includes Good afternoon in the afternoon", () => {
    expect(briefGreetingLine("Ida", dateAt(14))).toContain("Good afternoon");
  });

  it("includes Good evening in the evening", () => {
    expect(briefGreetingLine("Ida", dateAt(20))).toContain("Good evening");
  });
});
