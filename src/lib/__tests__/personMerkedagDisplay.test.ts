import {
  formatElapsedSinceStart,
  formatPersonMerkedagLine,
} from "@/lib/people/personMerkedagDisplay";

describe("personMerkedagDisplay", () => {
  const asOf = new Date(2026, 10, 1); // 1 Nov 2026

  it("formats birthday with date only (age lives in the header)", () => {
    const line = formatPersonMerkedagLine("Birthday", null, "1987-09-12", true, "no", asOf);
    expect(line).toBe("Bursdag · 12. sep. 1987");
    expect(line).not.toContain("38 år");
  });

  it("formats smoke-free without stuttering the kind word", () => {
    const line = formatPersonMerkedagLine("Smoke-free", null, "2008-05-15", true, "no", asOf);
    expect(line).toMatch(/^Røykfri · siden 15\. mai 2008 · /);
    expect(line).not.toMatch(/røykfri siden/);
    expect(line).toMatch(/år og \d+ måned/);
  });

  it("formats anniversary as siden date · elapsed", () => {
    const line = formatPersonMerkedagLine("Anniversary", null, "2003-05-15", true, "no", asOf);
    expect(line).toMatch(/^Bryllupsdag · siden 15\. mai 2003 · /);
    expect(line).not.toMatch(/gift siden/);
  });
});

describe("formatElapsedSinceStart", () => {
  it("combines years and months with og when both are non-zero", () => {
    const result = formatElapsedSinceStart("2008-05-15", new Date(2026, 10, 1), "no");
    expect(result).toMatch(/år og \d+ måned/);
  });
});
