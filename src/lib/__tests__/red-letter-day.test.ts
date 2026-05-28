import type { RedLetterDayInput } from "@/lib/red-letter-day";
import {
  BIRTHDAY_SENTINEL_YEAR,
  normalizeRedLetterDay,
  redLetterDisplayLabel,
} from "@/lib/red-letter-day";

function makeInput(overrides: Partial<RedLetterDayInput> = {}): RedLetterDayInput {
  return {
    kind: "Birthday",
    label: null,
    eventDate: "1990-06-15",
    yearKnown: true,
    recurring: true,
    ...overrides,
  };
}

describe("redLetterDisplayLabel", () => {
  it('returns custom label for kind "Other"', () => {
    expect(redLetterDisplayLabel("Other", "Our trip to Rome")).toBe("Our trip to Rome");
  });

  it('returns kind when "Other" but label is null', () => {
    expect(redLetterDisplayLabel("Other", null)).toBe("Other");
  });

  it('returns kind when "Other" but label is blank', () => {
    expect(redLetterDisplayLabel("Other", "   ")).toBe("Other");
  });

  it("returns label for non-Other kind when label is set", () => {
    expect(redLetterDisplayLabel("Birthday", "Ida's bday")).toBe("Ida's bday");
  });

  it("returns kind for Birthday when label is null", () => {
    expect(redLetterDisplayLabel("Birthday", null)).toBe("Birthday");
  });

  it("returns kind for Anniversary when label is blank", () => {
    expect(redLetterDisplayLabel("Anniversary", "  ")).toBe("Anniversary");
  });
});

describe("normalizeRedLetterDay", () => {
  it("replaces year with sentinel when yearKnown is false", () => {
    const input = makeInput({ yearKnown: false, eventDate: "1990-06-15" });
    const result = normalizeRedLetterDay(input);
    expect(result.eventDate).toBe(`${BIRTHDAY_SENTINEL_YEAR}-06-15`);
  });

  it("sets yearKnown to false when sentinel year is applied", () => {
    const input = makeInput({ yearKnown: false, eventDate: "1990-06-15" });
    expect(normalizeRedLetterDay(input).yearKnown).toBe(false);
  });

  it("leaves date unchanged when yearKnown is true", () => {
    const input = makeInput({ yearKnown: true, eventDate: "1990-06-15" });
    const result = normalizeRedLetterDay(input);
    expect(result.eventDate).toBe("1990-06-15");
  });

  it("does not modify date already using sentinel year", () => {
    const input = makeInput({ yearKnown: false, eventDate: `${BIRTHDAY_SENTINEL_YEAR}-03-22` });
    const result = normalizeRedLetterDay(input);
    expect(result.eventDate).toBe(`${BIRTHDAY_SENTINEL_YEAR}-03-22`);
  });

  it("preserves all other fields", () => {
    const input = makeInput({ kind: "Anniversary", label: "Wedding", recurring: false });
    const result = normalizeRedLetterDay(input);
    expect(result.kind).toBe("Anniversary");
    expect(result.label).toBe("Wedding");
    expect(result.recurring).toBe(false);
  });
});
