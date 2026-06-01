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
});
