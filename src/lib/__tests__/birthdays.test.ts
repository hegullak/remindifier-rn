import { nextBirthdayOccurrence } from "@/lib/timeline/birthdays";

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

describe("nextBirthdayOccurrence", () => {
  it("returns daysUntil 0 when birthday is today", () => {
    const today = date(2024, 6, 15);
    const result = nextBirthdayOccurrence("1990-06-15", today);
    expect(result).not.toBeNull();
    expect(result?.daysUntil).toBe(0);
  });

  it("returns daysUntil 1 when birthday is tomorrow", () => {
    const today = date(2024, 6, 14);
    const result = nextBirthdayOccurrence("1990-06-15", today);
    expect(result).not.toBeNull();
    expect(result?.daysUntil).toBe(1);
  });

  it("wraps to next year when birthday has passed this year", () => {
    const today = date(2024, 6, 16);
    const result = nextBirthdayOccurrence("1990-06-15", today);
    expect(result).not.toBeNull();
    expect(result?.daysUntil).toBeGreaterThan(300);
    expect(result?.nextDate.getFullYear()).toBe(2025);
  });

  it("returns null for invalid date string", () => {
    expect(nextBirthdayOccurrence("not-a-date", date(2024, 1, 1))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(nextBirthdayOccurrence("", date(2024, 1, 1))).toBeNull();
  });

  it("returns null for month > 12", () => {
    expect(nextBirthdayOccurrence("1990-13-01", date(2024, 1, 1))).toBeNull();
  });

  it("returns null for day < 1", () => {
    expect(nextBirthdayOccurrence("1990-06-00", date(2024, 1, 1))).toBeNull();
  });

  it("returns correct next date for leap day birthday", () => {
    const today = date(2024, 3, 1);
    const result = nextBirthdayOccurrence("2000-02-29", today);
    expect(result).not.toBeNull();
    // Next occurrence from March 2024 — Feb 29 doesn't exist in 2025, so further out
    expect(result?.daysUntil).toBeGreaterThan(0);
  });

  it("nextDate has correct month and day", () => {
    const today = date(2024, 1, 1);
    const result = nextBirthdayOccurrence("1985-08-20", today);
    expect(result).not.toBeNull();
    expect(result?.nextDate.getMonth()).toBe(7); // August (0-indexed)
    expect(result?.nextDate.getDate()).toBe(20);
  });

  it("sentinel year (0001) is handled without negative daysUntil", () => {
    const today = date(2024, 6, 15);
    const result = nextBirthdayOccurrence("0001-06-15", today);
    expect(result).not.toBeNull();
    expect(result?.daysUntil).toBeGreaterThanOrEqual(0);
  });
});
