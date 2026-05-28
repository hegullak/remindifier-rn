import {
  currentAnniversaryName,
  upcomingAnniversaryMilestone,
  weddingAnniversaryYears,
} from "@/lib/milestones/anniversaries";

function date(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

describe("upcomingAnniversaryMilestone", () => {
  it("returns sølvbryllup (25 years) when within window", () => {
    const today = date(2024, 5, 1);
    const anniversary = "1999-05-20"; // 25 years on May 20
    const result = upcomingAnniversaryMilestone(anniversary, today, 90);
    expect(result).not.toBeNull();
    expect(result!.years).toBe(25);
    expect(result!.name).toBe("Sølvbryllup");
  });

  it("returns null when anniversary is outside the window", () => {
    const today = date(2024, 1, 1);
    const anniversary = "1999-12-01"; // 11 months away — not a milestone year
    expect(upcomingAnniversaryMilestone(anniversary, today, 90)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(upcomingAnniversaryMilestone(null, date(2024, 1, 1), 90)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(upcomingAnniversaryMilestone(undefined, date(2024, 1, 1), 90)).toBeNull();
  });

  it("returns null for future anniversary year", () => {
    const today = date(2024, 1, 1);
    expect(upcomingAnniversaryMilestone("2030-06-01", today, 365)).toBeNull();
  });

  it("returns gullbryllup (50 years) within window", () => {
    const today = date(2024, 6, 1);
    const anniversary = "1974-06-15"; // 50 years in June 2024
    const result = upcomingAnniversaryMilestone(anniversary, today, 90);
    expect(result).not.toBeNull();
    expect(result!.years).toBe(50);
    expect(result!.name).toBe("Gullbryllup");
  });

  it("returns non-null daysUntil when milestone is today", () => {
    const today = date(2024, 6, 1);
    const anniversary = "1999-06-01"; // exactly 25 years today
    const result = upcomingAnniversaryMilestone(anniversary, today, 90);
    expect(result).not.toBeNull();
    expect(result!.daysUntil).toBe(0);
  });
});

describe("currentAnniversaryName", () => {
  it("returns gullbryllup for 50-year anniversary this year", () => {
    const today = date(2024, 6, 15);
    const result = currentAnniversaryName("1974-06-15", today);
    expect(result).not.toBeNull();
    expect(result!.years).toBe(50);
    expect(result!.name).toBe("Gullbryllup");
  });

  it("returns null for null input", () => {
    expect(currentAnniversaryName(null, date(2024, 1, 1))).toBeNull();
  });

  it("returns null when year is not a named milestone", () => {
    // 22 years — no name in the map
    const today = date(2024, 6, 1);
    expect(currentAnniversaryName("2002-06-01", today)).toBeNull();
  });
});

describe("weddingAnniversaryYears", () => {
  it("returns correct years when anniversary has passed this year", () => {
    const today = date(2024, 8, 1); // Aug 1
    const result = weddingAnniversaryYears("1999-06-15", today);
    expect(result).toBe(25);
  });

  it("returns one fewer year when anniversary has not yet occurred this year", () => {
    const today = date(2024, 3, 1); // Mar 1 — before June
    const result = weddingAnniversaryYears("1999-06-15", today);
    expect(result).toBe(24);
  });

  it("returns null for year 0 or invalid", () => {
    expect(weddingAnniversaryYears("0000-06-15", date(2024, 1, 1))).toBeNull();
  });

  it("returns null if anniversary is in the future", () => {
    expect(weddingAnniversaryYears("2030-06-15", date(2024, 1, 1))).toBeNull();
  });
});
