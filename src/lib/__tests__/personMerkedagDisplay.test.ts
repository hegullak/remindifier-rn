import {
  formatElapsedSinceStart,
  formatPersonMerkedagLine,
} from "@/lib/people/personMerkedagDisplay";

describe("personMerkedagDisplay", () => {
  const asOf = new Date(2026, 10, 1); // 1 Nov 2026

  it("formats birthday as date only (kind shown via icon; age in header)", () => {
    const line = formatPersonMerkedagLine("Birthday", null, "1987-09-12", true, "no", asOf);
    expect(line).toBe("12. sep. 1987");
    expect(line).not.toContain("Bursdag");
    expect(line).not.toContain("38 år");
  });

  it("formats smoke-free as elapsed (with months) · siden date, no kind word", () => {
    const line = formatPersonMerkedagLine("Smoke-free", null, "2008-05-15", true, "no", asOf);
    expect(line).toMatch(/^\d+ år og \d+ måned/);
    expect(line).toContain("siden 15. mai 2008");
    expect(line).not.toMatch(/Røykfri|røykfri/);
  });

  it("formats anniversary as day+month · years (no 'siden', no months, no kind word)", () => {
    const line = formatPersonMerkedagLine("Anniversary", null, "2003-05-15", true, "no", asOf);
    expect(line).toBe("15. mai · 23 år");
    expect(line).not.toMatch(/siden|Bryllupsdag|måned/);
  });
});

describe("formatElapsedSinceStart", () => {
  it("combines years and months with og when both are non-zero", () => {
    const result = formatElapsedSinceStart("2008-05-15", new Date(2026, 10, 1), "no");
    expect(result).toMatch(/år og \d+ måned/);
  });

  it("returns years only in English", () => {
    const result = formatElapsedSinceStart("2020-01-01", new Date(2026, 0, 1), "en");
    expect(result).toMatch(/6 years/);
  });

  it("returns months only when under one year", () => {
    const result = formatElapsedSinceStart("2026-01-01", new Date(2026, 5, 1), "en");
    expect(result).toMatch(/month/);
  });

  it("returns null for future dates", () => {
    expect(formatElapsedSinceStart("2030-01-01", new Date(2026, 0, 1), "en")).toBeNull();
  });
});

describe("formatPersonMerkedagLine edge cases", () => {
  const asOf = new Date(2026, 10, 1);

  it("formats Other kind with custom label", () => {
    const line = formatPersonMerkedagLine("Other", "Dåp", "2020-06-01", true, "no", asOf);
    expect(line).toContain("Dåp ·");
    expect(line).toContain("siden");
  });

  it("formats anniversary without full years yet", () => {
    const line = formatPersonMerkedagLine("Anniversary", null, "2026-08-01", true, "en", asOf);
    expect(line).toMatch(/Aug/i);
    expect(line).not.toContain("years");
  });

  it("formats birthday in English", () => {
    const line = formatPersonMerkedagLine("Birthday", null, "1987-09-12", true, "en", asOf);
    expect(line).toMatch(/1987/);
  });
});
