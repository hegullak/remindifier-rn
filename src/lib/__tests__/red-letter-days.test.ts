import type { RedLetterDayRow } from "@/lib/timeline/red-letter-days";
import {
  legacyAnniversaryRow,
  legacyBirthdayRow,
  upcomingRedLetterDays,
} from "@/lib/timeline/red-letter-days";

function date(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function makeRow(overrides: Partial<RedLetterDayRow> = {}): RedLetterDayRow {
  return {
    id: "row-1",
    personId: "person-1",
    personName: "Ida Nilsen",
    kind: "Birthday",
    label: null,
    eventDate: "1990-06-15",
    yearKnown: true,
    ...overrides,
  };
}

const TODAY = date(2024, 5, 1); // 1 May 2024
const WINDOW = 60;
const EN = "en" as const;
const NO = "no" as const;

describe("upcomingRedLetterDays", () => {
  it("returns empty array for empty input", () => {
    expect(upcomingRedLetterDays([], TODAY, WINDOW, EN)).toEqual([]);
  });

  it("excludes rows outside the window", () => {
    const row = makeRow({ eventDate: "1990-09-01" }); // 4 months away
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)).toHaveLength(0);
  });

  it("includes rows inside the window", () => {
    const row = makeRow({ eventDate: "1990-05-20" }); // 19 days away
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)).toHaveLength(1);
  });

  it("marks isToday true when birthday is today", () => {
    const row = makeRow({ eventDate: "1990-05-01" });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, EN);
    expect(result[0].isToday).toBe(true);
    expect(result[0].daysUntil).toBe(0);
  });

  it("marks isToday false when birthday is tomorrow", () => {
    const row = makeRow({ eventDate: "1990-05-02" });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, EN);
    expect(result[0].isToday).toBe(false);
    expect(result[0].daysUntil).toBe(1);
  });

  it("deduplicates identical person/kind/day entries", () => {
    const row1 = makeRow({ id: "a", eventDate: "1990-05-10" });
    const row2 = makeRow({ id: "b", eventDate: "1990-05-10" }); // same person/kind/day
    const result = upcomingRedLetterDays([row1, row2], TODAY, WINDOW, EN);
    expect(result).toHaveLength(1);
  });

  it("keeps two different people with same birthday", () => {
    const row1 = makeRow({ id: "a", personId: "p1", eventDate: "1990-05-10" });
    const row2 = makeRow({ id: "b", personId: "p2", personName: "Anna", eventDate: "1990-05-10" });
    const result = upcomingRedLetterDays([row1, row2], TODAY, WINDOW, EN);
    expect(result).toHaveLength(2);
  });

  it("sorts by daysUntil ascending", () => {
    const near = makeRow({ id: "a", personId: "p1", eventDate: "1990-05-05" });
    const far = makeRow({ id: "b", personId: "p2", personName: "Anna", eventDate: "1990-05-20" });
    const result = upcomingRedLetterDays([far, near], TODAY, WINDOW, EN);
    expect(result[0].daysUntil).toBeLessThan(result[1].daysUntil);
  });

  it("uses birthday icon for Birthday kind", () => {
    const row = makeRow({ eventDate: "1990-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)[0].icon).toBe("🎂");
  });

  it("uses anniversary icon for Anniversary kind", () => {
    const row = makeRow({ kind: "Anniversary", eventDate: "2010-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)[0].icon).toBe("💍");
  });

  it("uses no-smoking icon for Smoke-free kind", () => {
    const row = makeRow({ kind: "Smoke-free", eventDate: "2020-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)[0].icon).toBe("🚭");
  });

  it("builds headline with age for Birthday with known year", () => {
    const row = makeRow({ eventDate: "1990-05-01", yearKnown: true }); // turning 34 today
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, EN);
    expect(result[0].headline).toBe("Turning 34");
  });

  it("builds Norwegian anniversary headline with couple names", () => {
    const row = makeRow({
      kind: "Anniversary",
      label: "Jonas og Kari",
      eventDate: "2006-06-04",
      yearKnown: true,
    });
    const result = upcomingRedLetterDays([row], date(2026, 5, 29), WINDOW, NO);
    expect(result[0].headline).toBe("Jonas og Kari — Porselensbryllup");
  });

  it('builds headline as just "Birthday" when year unknown', () => {
    const row = makeRow({ eventDate: "0001-05-10", yearKnown: false });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, EN);
    expect(result[0].headline).toBe("Birthday");
  });

  it('timing is "Today" when daysUntil is 0 in English', () => {
    const row = makeRow({ eventDate: "1990-05-01" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)[0].timing).toBe("Today");
  });

  it("builds Norwegian birthday age headline", () => {
    const row = makeRow({ eventDate: "1956-05-27", yearKnown: true });
    const result = upcomingRedLetterDays([row], date(2026, 5, 27), WINDOW, NO);
    expect(result[0].headline).toBe("Fyller 70 år");
  });

  it('timing is "I dag" when daysUntil is 0 in Norwegian', () => {
    const row = makeRow({ eventDate: "1990-05-01" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, NO)[0].timing).toContain("I dag");
  });

  it('timing is "Tomorrow" when daysUntil is 1', () => {
    const row = makeRow({ eventDate: "1990-05-02" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW, EN)[0].timing).toBe("Tomorrow");
  });

  it("timing is weekday name when daysUntil is 2–6", () => {
    const row = makeRow({ eventDate: "1990-05-04" }); // 3 days away = Sunday 5 May
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, EN);
    expect([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]).toContain(result[0].timing);
  });

  it("uses Norwegian birthday headline", () => {
    const row = makeRow({ eventDate: "1990-05-01", yearKnown: true });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW, NO);
    expect(result[0].headline).toBe("Fyller 34 år");
  });
});

describe("legacyBirthdayRow", () => {
  it("builds a row with correct kind and personId", () => {
    const row = legacyBirthdayRow("pid", "Jonas", "1978-01-18", true);
    expect(row.kind).toBe("Birthday");
    expect(row.personId).toBe("pid");
    expect(row.personName).toBe("Jonas");
    expect(row.eventDate).toBe("1978-01-18");
    expect(row.yearKnown).toBe(true);
    expect(row.id).toContain("pid");
  });
});

describe("legacyAnniversaryRow", () => {
  it("builds a row with kind Anniversary and yearKnown true", () => {
    const row = legacyAnniversaryRow("pid", "Jonas", "2010-06-01");
    expect(row.kind).toBe("Anniversary");
    expect(row.yearKnown).toBe(true);
    expect(row.eventDate).toBe("2010-06-01");
  });
});
