import { parseNaturalPersonInput } from "@/lib/people/naturalLanguageParser";
import {
  normalizeApiDraftPayload,
  parseNaturalPersonInputFromCompletion,
} from "@/lib/people/naturalLanguageParser.api";
import { parseNaturalPersonInputLocal } from "@/lib/people/naturalLanguageParser.local";

const KENNETH_INPUT =
  "Kenneth feirer 50 årsdag i morgen. Han er min beste venn. Han hadde bursdag 12 mars i år.";

describe("parseNaturalPersonInput", () => {
  const originalFetch = global.fetch;
  const originalParseUrl = process.env.EXPO_PUBLIC_PARSE_API_URL;
  const getToken = async () => "test-token";

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalParseUrl) process.env.EXPO_PUBLIC_PARSE_API_URL = originalParseUrl;
    else delete process.env.EXPO_PUBLIC_PARSE_API_URL;
  });

  it("uses parse API when configured and returns structured data", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                displayName: "Kenneth",
                relationType: "beste venn",
                birthday: "1976-03-12",
                birthdayYearKnown: true,
                funFacts: [],
                pendingActions: [],
              }),
              refusal: null,
            },
          },
        ],
      }),
    }) as typeof fetch;

    const result = await parseNaturalPersonInput(KENNETH_INPUT, { getToken });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.displayName).toBe("Kenneth");
    expect(result.relationType).toBe("beste venn");
    expect(result.birthday).toBe("1976-03-12");
    expect(result.birthdayYearKnown).toBe(true);
  });

  it("falls back to local parser when API fails", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example.com";
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as typeof fetch;

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-29T12:00:00Z"));

    const result = await parseNaturalPersonInput(KENNETH_INPUT, { getToken });
    const local = parseNaturalPersonInputLocal(KENNETH_INPUT);

    expect(result).toEqual(local);
    jest.useRealTimers();
  });

  it("falls back to local parser when API response cannot be parsed", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example.com";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "not-json", refusal: null } }],
      }),
    }) as typeof fetch;

    const result = await parseNaturalPersonInput("Helga er venn", { getToken });
    expect(global.fetch).toHaveBeenCalled();
    expect(result.displayName).toBe("Helga");
  });

  it("falls back to local parser when parse API URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_PARSE_API_URL;
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

describe("parseNaturalPersonInputFromCompletion", () => {
  it("returns null for malformed JSON", () => {
    expect(parseNaturalPersonInputFromCompletion("Kenneth", "not-json")).toBeNull();
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
