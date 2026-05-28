import {
  DEFAULT_BRIEF_SECTION_ORDER,
  normalizeBriefSectionOrder,
} from "@/lib/brief/sections";

describe("normalizeBriefSectionOrder", () => {
  it("returns full default order for undefined input", () => {
    expect(normalizeBriefSectionOrder(undefined)).toEqual(DEFAULT_BRIEF_SECTION_ORDER);
  });

  it("returns full default order for empty array", () => {
    expect(normalizeBriefSectionOrder([])).toEqual(DEFAULT_BRIEF_SECTION_ORDER);
  });

  it("preserves a valid custom order", () => {
    const custom = ["red_letter", "schedule", "weather", "headsup", "training"];
    expect(normalizeBriefSectionOrder(custom)).toEqual(custom);
  });

  it("filters out unknown section IDs", () => {
    const input = ["weather", "unknown_section", "schedule"];
    const result = normalizeBriefSectionOrder(input);
    expect(result).not.toContain("unknown_section");
    expect(result).toContain("weather");
    expect(result).toContain("schedule");
  });

  it("deduplicates repeated section IDs", () => {
    const input = ["weather", "weather", "schedule"];
    const result = normalizeBriefSectionOrder(input);
    expect(result.filter((s) => s === "weather")).toHaveLength(1);
  });

  it("appends missing sections at the end in default order", () => {
    const result = normalizeBriefSectionOrder(["weather"]);
    expect(result[0]).toBe("weather");
    // Remaining 4 sections appended
    expect(result).toHaveLength(5);
    // Appended sections follow default order
    const appended = result.slice(1);
    const defaultWithoutWeather = DEFAULT_BRIEF_SECTION_ORDER.filter((s) => s !== "weather");
    expect(appended).toEqual(defaultWithoutWeather);
  });

  it("always returns exactly 5 sections", () => {
    expect(normalizeBriefSectionOrder(undefined)).toHaveLength(5);
    expect(normalizeBriefSectionOrder([])).toHaveLength(5);
    expect(normalizeBriefSectionOrder(["red_letter"])).toHaveLength(5);
  });
});
