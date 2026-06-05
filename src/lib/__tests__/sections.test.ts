import { DEFAULT_BRIEF_SECTION_ORDER, normalizeBriefSectionOrder } from "@/lib/brief/sections";

describe("normalizeBriefSectionOrder", () => {
  it("returns full default order for undefined input", () => {
    expect(normalizeBriefSectionOrder(undefined)).toEqual(DEFAULT_BRIEF_SECTION_ORDER);
  });

  it("returns full default order for empty array", () => {
    expect(normalizeBriefSectionOrder([])).toEqual(DEFAULT_BRIEF_SECTION_ORDER);
  });

  it("preserves a valid custom order", () => {
    const custom = ["red_letter", "schedule", "calendar", "headsup", "training"];
    expect(normalizeBriefSectionOrder(custom)).toEqual(custom);
  });

  it("filters out unknown section IDs", () => {
    const input = ["weather", "unknown_section", "schedule"];
    const result = normalizeBriefSectionOrder(input);
    expect(result).not.toContain("unknown_section");
    expect(result).not.toContain("weather");
    expect(result).toContain("schedule");
  });

  it("deduplicates repeated section IDs", () => {
    const input = ["schedule", "schedule", "calendar"];
    const result = normalizeBriefSectionOrder(input);
    expect(result.filter((s) => s === "schedule")).toHaveLength(1);
  });

  it("appends missing sections at the end in default order", () => {
    const result = normalizeBriefSectionOrder(["calendar"]);
    expect(result[0]).toBe("calendar");
    expect(result).toHaveLength(DEFAULT_BRIEF_SECTION_ORDER.length);
    const appended = result.slice(1);
    const defaultWithoutCalendar = DEFAULT_BRIEF_SECTION_ORDER.filter((s) => s !== "calendar");
    expect(appended).toEqual(defaultWithoutCalendar);
  });

  it("always returns all sections", () => {
    const total = DEFAULT_BRIEF_SECTION_ORDER.length;
    expect(normalizeBriefSectionOrder(undefined)).toHaveLength(total);
    expect(normalizeBriefSectionOrder([])).toHaveLength(total);
    expect(normalizeBriefSectionOrder(["red_letter"])).toHaveLength(total);
  });

  it("includes calendar in default order between schedule and headsup", () => {
    const order = normalizeBriefSectionOrder(undefined);
    expect(order.indexOf("calendar")).toBeGreaterThan(order.indexOf("schedule"));
    expect(order.indexOf("headsup")).toBeGreaterThan(order.indexOf("calendar"));
  });
});
