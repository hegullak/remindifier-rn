import { mockDayEvents, mockDayEventsVariant } from "@/lib/brief/mockDay";

const SCENARIOS = ["light", "moderate", "busy"] as const;

describe("mockDayEventsVariant", () => {
  it("has 5 distinct variants per scenario", () => {
    for (const scenario of SCENARIOS) {
      const variants = Array.from({ length: 5 }, (_, i) => mockDayEventsVariant(scenario, i));
      const ids = variants.map((events) => events.map((e) => e.id).join(","));
      expect(new Set(ids).size).toBe(5);
    }
  });

  it("wraps around with modulo so index 5 repeats index 0", () => {
    for (const scenario of SCENARIOS) {
      expect(mockDayEventsVariant(scenario, 5)).toEqual(mockDayEventsVariant(scenario, 0));
      expect(mockDayEventsVariant(scenario, 7)).toEqual(mockDayEventsVariant(scenario, 2));
    }
  });

  it("mockDayEvents defaults to variant 0", () => {
    for (const scenario of SCENARIOS) {
      expect(mockDayEvents(scenario)).toEqual(mockDayEventsVariant(scenario, 0));
    }
  });

  it("light variants stay lighter than busy variants (fewer events)", () => {
    for (let i = 0; i < 5; i++) {
      expect(mockDayEventsVariant("light", i).length).toBeLessThan(
        mockDayEventsVariant("busy", i).length,
      );
    }
  });
});
