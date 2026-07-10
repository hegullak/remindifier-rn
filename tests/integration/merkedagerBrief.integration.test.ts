/**
 * Integration: DB-shaped merkedag rows → timeline → week filter → person display line.
 * Mirrors the filter logic used on the Brief tab for «Merkedager denne uken».
 */
import { getCalendarWeekBounds, isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { formatPersonMerkedagLine } from "@/lib/people/personMerkedagDisplay";
import {
  legacyAnniversaryRow,
  legacyBirthdayRow,
  upcomingRedLetterDays,
} from "@/lib/timeline/red-letter-days";

const TODAY = new Date(2026, 4, 1); // 1 May 2026 (Friday)

function redLettersThisWeek(
  rows: ReturnType<typeof upcomingRedLetterDays>,
  weekBounds: ReturnType<typeof getCalendarWeekBounds>,
) {
  return rows.filter((item) => {
    const next = new Date(TODAY);
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + item.daysUntil);
    return isDateInCalendarWeek(next, weekBounds);
  });
}

describe("merkedager brief pipeline", () => {
  it("keeps in-week birthdays and formats person detail line", () => {
    const weekBounds = getCalendarWeekBounds(TODAY, 0);
    const rows = [
      legacyBirthdayRow("p-ida", "Ida", "1990-05-03", true),
      legacyAnniversaryRow("p-jonas", "Jonas", "2010-09-01"),
    ];

    const upcoming = upcomingRedLetterDays(rows, TODAY, 60, "no");
    const thisWeek = redLettersThisWeek(upcoming, weekBounds);

    expect(thisWeek).toHaveLength(1);
    expect(thisWeek[0].personName).toBe("Ida");
    expect(thisWeek[0].headline).toMatch(/36|Fyller/i);

    const detailLine = formatPersonMerkedagLine("Birthday", null, "1990-05-03", true, "no", TODAY);
    expect(detailLine).toMatch(/1990/);
    expect(detailLine).not.toContain("Bursdag");
  });

  it("excludes merkedager outside the visible calendar week", () => {
    const weekBounds = getCalendarWeekBounds(TODAY, 0);
    const rows = [legacyBirthdayRow("p-far", "Pappa", "1950-06-20", true)];

    const upcoming = upcomingRedLetterDays(rows, TODAY, 60, "no");
    expect(redLettersThisWeek(upcoming, weekBounds)).toHaveLength(0);
    expect(upcoming[0].daysUntil).toBeGreaterThan(7);
  });
});
