import {
  legacyAnniversaryRow,
  legacyBirthdayRow,
  upcomingRedLetterDays,
} from "@/lib/timeline/red-letter-days";
import type { RedLetterDayRow } from "@/lib/timeline/red-letter-days";

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

describe("upcomingRedLetterDays", () => {
  it("returns empty array for empty input", () => {
    expect(upcomingRedLetterDays([], TODAY, WINDOW)).toEqual([]);
  });

  it("excludes rows outside the window", () => {
    const row = makeRow({ eventDate: "1990-09-01" }); // 4 months away
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)).toHaveLength(0);
  });

  it("includes rows inside the window", () => {
    const row = makeRow({ eventDate: "1990-05-20" }); // 19 days away
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)).toHaveLength(1);
  });

  it("marks isToday true when birthday is today", () => {
    const row = makeRow({ eventDate: "1990-05-01" });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW);
    expect(result[0].isToday).toBe(true);
    expect(result[0].daysUntil).toBe(0);
  });

  it("marks isToday false when birthday is tomorrow", () => {
    const row = makeRow({ eventDate: "1990-05-02" });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW);
    expect(result[0].isToday).toBe(false);
    expect(result[0].daysUntil).toBe(1);
  });

  it("deduplicates identical person/kind/day entries", () => {
    const row1 = makeRow({ id: "a", eventDate: "1990-05-10" });
    const row2 = makeRow({ id: "b", eventDate: "1990-05-10" }); // same person/kind/day
    const result = upcomingRedLetterDays([row1, row2], TODAY, WINDOW);
    expect(result).toHaveLength(1);
  });

  it("keeps two different people with same birthday", () => {
    const row1 = makeRow({ id: "a", personId: "p1", eventDate: "1990-05-10" });
    const row2 = makeRow({ id: "b", personId: "p2", personName: "Anna", eventDate: "1990-05-10" });
    const result = upcomingRedLetterDays([row1, row2], TODAY, WINDOW);
    expect(result).toHaveLength(2);
  });

  it("sorts by daysUntil ascending", () => {
    const near = makeRow({ id: "a", personId: "p1", eventDate: "1990-05-05" });
    const far = makeRow({ id: "b", personId: "p2", personName: "Anna", eventDate: "1990-05-20" });
    const result = upcomingRedLetterDays([far, near], TODAY, WINDOW);
    expect(result[0].daysUntil).toBeLessThan(result[1].daysUntil);
  });

  it("uses birthday icon for Birthday kind", () => {
    const row = makeRow({ eventDate: "1990-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)[0].icon).toBe("🎂");
  });

  it("uses anniversary icon for Anniversary kind", () => {
    const row = makeRow({ kind: "Anniversary", eventDate: "2010-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)[0].icon).toBe("💍");
  });

  it("uses trophy icon for Smoke-free kind", () => {
    const row = makeRow({ kind: "Smoke-free", eventDate: "2020-05-10" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)[0].icon).toBe("🏆");
  });

  it("builds headline with age for Birthday with known year", () => {
    const row = makeRow({ eventDate: "1990-05-01", yearKnown: true }); // turning 34 today
    const result = upcomingRedLetterDays([row], TODAY, WINDOW);
    expect(result[0].headline).toBe("Birthday · 34 years");
  });

  it('builds headline as just "Birthday" when year unknown', () => {
    const row = makeRow({ eventDate: "0001-05-10", yearKnown: false });
    const result = upcomingRedLetterDays([row], TODAY, WINDOW);
    expect(result[0].headline).toBe("Birthday");
  });

  it('timing is "Today" when daysUntil is 0', () => {
    const row = makeRow({ eventDate: "1990-05-01" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)[0].timing).toBe("Today");
  });

  it('timing is "Tomorrow" when daysUntil is 1', () => {
    const row = makeRow({ eventDate: "1990-05-02" });
    expect(upcomingRedLetterDays([row], TODAY, WINDOW)[0].timing).toBe("Tomorrow");
  });

  it("timing is weekday name when daysUntil is 2–6", () => {
    const row = makeRow({ eventDate: "1990-05-04" }); // 3 days away = Sunday 5 May
    const result = upcomingRedLetterDays([row], TODAY, WINDOW);
    expect(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).toContain(
      result[0].timing,
    );
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
