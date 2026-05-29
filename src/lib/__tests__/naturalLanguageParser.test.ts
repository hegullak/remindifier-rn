import { parseNaturalPersonInput } from "@/lib/people/naturalLanguageParser";
import {
  normalizeApiDraftPayload,
  parseNaturalPersonInputWithApi,
} from "@/lib/people/naturalLanguageParser.api";
import { parseNaturalPersonInputLocal } from "@/lib/people/naturalLanguageParser.local";

const KENNETH_INPUT =
  "Kenneth feirer 50 årsdag i morgen. Han er min beste venn. Han hadde bursdag 12 mars i år.";

describe("parseNaturalPersonInput", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = originalApiKey;
  });

  it("uses Claude API when configured and returns structured data", async () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              displayName: "Kenneth",
              relationType: "beste venn",
              birthday: "1976-03-12",
              birthdayYearKnown: true,
              funFacts: [],
            }),
          },
        ],
      }),
    }) as typeof fetch;

    const result = await parseNaturalPersonInput(KENNETH_INPUT);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.displayName).toBe("Kenneth");
    expect(result.relationType).toBe("beste venn");
    expect(result.birthday).toBe("1976-03-12");
    expect(result.birthdayYearKnown).toBe(true);
  });

  it("falls back to local parser when API fails", async () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as typeof fetch;

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-29T12:00:00Z"));

    const result = await parseNaturalPersonInput(KENNETH_INPUT);
    const local = parseNaturalPersonInputLocal(KENNETH_INPUT);

    expect(result).toEqual(local);
    jest.useRealTimers();
  });

  it("falls back to local parser when API response cannot be parsed", async () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "not-json" }] }),
    }) as typeof fetch;

    const result = await parseNaturalPersonInput("Helga er venn");
    expect(global.fetch).toHaveBeenCalled();
    expect(result.displayName).toBe("Helga");
  });

  it("falls back to local parser when API key is missing", async () => {
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = "";
    global.fetch = jest.fn() as typeof fetch;

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-29T12:00:00Z"));

    const result = await parseNaturalPersonInput(KENNETH_INPUT);
    const local = parseNaturalPersonInputLocal(KENNETH_INPUT);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result).toEqual(local);

    jest.useRealTimers();
  });
});

describe("parseNaturalPersonInputWithApi", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns null on HTTP errors and malformed payloads", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch;
    await expect(parseNaturalPersonInputWithApi("Kenneth", "test-key")).resolves.toBeNull();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "not-json" }] }),
    }) as typeof fetch;
    await expect(parseNaturalPersonInputWithApi("Kenneth", "test-key")).resolves.toBeNull();
  });
});

describe("normalizeApiDraftPayload", () => {
  it("returns null for invalid payloads", () => {
    expect(normalizeApiDraftPayload(null, "raw")).toBeNull();
    expect(normalizeApiDraftPayload({ birthday: "not-a-date" }, "raw")).toBeNull();
  });

  it("normalizes unknown-year birthdays to sentinel year", () => {
    const draft = normalizeApiDraftPayload(
      {
        displayName: "Trine",
        relationType: "søster",
        birthday: "1990-06-05",
        birthdayYearKnown: false,
        funFacts: ["Likes morning calls"],
      },
      "raw",
    );

    expect(draft?.birthday).toBe("0001-06-05");
    expect(draft?.birthdayYearKnown).toBe(false);
  });
});
