import {
  formatElapsedSinceStart,
  formatPersonMerkedagLine,
} from "@/lib/people/personMerkedagDisplay";

describe("personMerkedagDisplay", () => {
  const asOf = new Date(2026, 10, 1); // 1 Nov 2026

  it("formats birthday with age on one line", () => {
    const line = formatPersonMerkedagLine("Birthday", null, "1987-09-12", true, "no", asOf);
    expect(line).toContain("Bursdag");
    expect(line).toContain("38 år");
    expect(line).toContain("12. sep. 1987");
  });

  it("formats smoke-free with siden phrasing", () => {
    const line = formatPersonMerkedagLine("Smoke-free", null, "2008-11-01", true, "no", asOf);
    expect(line).toContain("Røykfri");
    expect(line).toMatch(/røykfri siden/i);
    expect(line).toContain("1. nov. 2008");
  });

  it("formats anniversary with gift siden and milestone", () => {
    const line = formatPersonMerkedagLine("Anniversary", null, "2003-11-01", true, "no", asOf);
    expect(line).toContain("Bryllupsdag");
    expect(line).toMatch(/gift siden/i);
    expect(line).toContain("1. nov. 2003");
  });
});

describe("formatElapsedSinceStart", () => {
  it("combines years and months when both are non-zero", () => {
    const result = formatElapsedSinceStart("2008-05-15", new Date(2026, 10, 1), "no");
    expect(result).toMatch(/år/);
    expect(result).toMatch(/måned/);
  });
});
