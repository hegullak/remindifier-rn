import {
  formatHolidayLine,
  getNorwegianHolidays,
  getUpcomingHoliday,
} from "@/lib/brief/norwegianHolidays";

describe("getNorwegianHolidays", () => {
  it("includes fixed and Easter-linked holidays", () => {
    const holidays = getNorwegianHolidays(2026);
    const names = holidays.map((h) => h.nameNo);
    expect(names).toContain("Nyttårsdag");
    expect(names).toContain("17. mai");
    expect(names).toContain("1. påskedag");
  });
});

describe("getUpcomingHoliday", () => {
  it("returns null when no holiday in window", () => {
    expect(getUpcomingHoliday(new Date(2026, 6, 10), "no", 3)).toBeNull();
  });

  it("finds next holiday within window", () => {
    const before17May = new Date(2026, 4, 10);
    const info = getUpcomingHoliday(before17May, "no", 21);
    expect(info).not.toBeNull();
    expect(info?.daysUntil).toBeGreaterThan(0);
    expect(info?.daysUntil).toBeLessThanOrEqual(21);
  });

  it("suggests bridge day for Thursday holiday (en)", () => {
    const info = getUpcomingHoliday(new Date(2026, 4, 12), "en", 21);
    expect(info?.holiday.name).toBe("Ascension Day");
    expect(info?.bridgeDaySuggestion).toMatch(/Friday off/i);
  });
});

describe("formatHolidayLine", () => {
  const holidayOrNull = getNorwegianHolidays(2026).find((h) => h.nameNo === "17. mai");

  beforeAll(() => {
    if (!holidayOrNull) throw new Error("Holiday not found");
  });

  it("formats today (no)", () => {
    const holiday = holidayOrNull;
    if (!holiday) return;
    expect(
      formatHolidayLine({ holiday, daysUntil: 0, bridgeDaySuggestion: undefined }, "no"),
    ).toContain("I dag");
  });

  it("formats tomorrow (en)", () => {
    const holiday = holidayOrNull;
    if (!holiday) return;
    expect(
      formatHolidayLine({ holiday, daysUntil: 1, bridgeDaySuggestion: undefined }, "en"),
    ).toMatch(/tomorrow/i);
  });

  it("formats days away (no/en)", () => {
    const holiday = holidayOrNull;
    if (!holiday) return;
    expect(
      formatHolidayLine({ holiday, daysUntil: 5, bridgeDaySuggestion: undefined }, "no"),
    ).toContain("5 dager");
    expect(
      formatHolidayLine({ holiday, daysUntil: 5, bridgeDaySuggestion: undefined }, "en"),
    ).toContain("5 days");
  });

  it("formats within three days (no) and longer horizon (en)", () => {
    const holiday = holidayOrNull;
    if (!holiday) return;
    expect(
      formatHolidayLine({ holiday, daysUntil: 2, bridgeDaySuggestion: undefined }, "no"),
    ).toContain("2 dager");
    expect(
      formatHolidayLine({ holiday, daysUntil: 10, bridgeDaySuggestion: undefined }, "en"),
    ).toContain("10 days");
  });
});
