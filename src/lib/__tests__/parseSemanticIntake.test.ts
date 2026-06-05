import { parseSemanticIntake } from "@/lib/intake/parseSemanticIntake";
import { fetchParseCompletion } from "@/lib/parse/parseApiClient";

jest.mock("@/lib/parse/parseApiClient", () => ({
  fetchParseCompletion: jest.fn(),
}));

const WEDNESDAY = new Date("2026-05-27T12:00:00");
const mockedFetch = fetchParseCompletion as jest.MockedFunction<typeof fetchParseCompletion>;

describe("parseSemanticIntake", () => {
  const originalUrl = process.env.EXPO_PUBLIC_PARSE_API_URL;

  afterEach(() => {
    mockedFetch.mockReset();
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_PARSE_API_URL;
    else process.env.EXPO_PUBLIC_PARSE_API_URL = originalUrl;
  });

  it("delegates blank input to local parser", async () => {
    const result = await parseSemanticIntake("   ", { referenceDate: WEDNESDAY, locale: "no" });
    expect(result.rawText).toBe("");
    expect(result.overallConfidence).toBe("low");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("uses local parser when API URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_PARSE_API_URL;
    const result = await parseSemanticIntake("Middag med Ola fredag kl 19", {
      referenceDate: WEDNESDAY,
      locale: "no",
    });
    expect(result.person?.name).toBe("Ola");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("falls back to local parser when API returns no content", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example";
    mockedFetch.mockResolvedValue(null);
    const result = await parseSemanticIntake("Lunch with Anna tomorrow", {
      referenceDate: WEDNESDAY,
      locale: "en",
      getToken: async () => "token",
    });
    expect(result.person?.name).toBe("Anna");
    expect(mockedFetch).toHaveBeenCalled();
  });
});
