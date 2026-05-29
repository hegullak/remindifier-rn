import {
  applyYearKnownToIso,
  formatBirthdayLabel,
  isoToPickerDate,
  pickerDateToIso,
} from "@/lib/birthdayForm";

describe("birthdayForm", () => {
  it("round-trips known-year dates", () => {
    const iso = "1976-03-12";
    const date = isoToPickerDate(iso, true);
    expect(pickerDateToIso(date, true)).toBe(iso);
  });

  it("uses sentinel year when year is unknown", () => {
    const date = new Date(2000, 2, 14);
    expect(pickerDateToIso(date, false)).toBe("0001-03-14");
  });

  it("applies year-known toggle to stored iso", () => {
    expect(applyYearKnownToIso("0001-03-14", true)).toBe("2000-03-14");
    expect(applyYearKnownToIso("1976-03-12", false)).toBe("0001-03-12");
  });

  it("formats month-only labels without year", () => {
    const label = formatBirthdayLabel("0001-03-14", false, "en");
    expect(label).toMatch(/14/);
    expect(label).not.toMatch(/0001/);
  });

  it("handles invalid iso strings safely", () => {
    expect(formatBirthdayLabel("invalid", true, "en")).toBe("");
    expect(isoToPickerDate("invalid", true).getFullYear()).toBe(2000);
  });
});
