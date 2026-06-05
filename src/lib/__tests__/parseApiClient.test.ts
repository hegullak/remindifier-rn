import { fetchParseCompletion } from "@/lib/parse/parseApiClient";

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn() },
}));

describe("fetchParseCompletion", () => {
  const originalUrl = process.env.EXPO_PUBLIC_PARSE_API_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_PARSE_API_URL;
    else process.env.EXPO_PUBLIC_PARSE_API_URL = originalUrl;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("returns null when API URL is unset", async () => {
    delete process.env.EXPO_PUBLIC_PARSE_API_URL;
    const result = await fetchParseCompletion("hello", "intake", async () => "token");
    expect(result).toBeNull();
  });

  it("returns null when token is missing", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example/";
    const result = await fetchParseCompletion("hello", "intake", async () => null);
    expect(result).toBeNull();
  });

  it("returns parsed JSON on success", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example";
    const payload = { id: "c1", choices: [] };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    }) as typeof fetch;

    const result = await fetchParseCompletion("hello", "person", async () => "tok");
    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://parse.example/api/parse",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer tok" }),
      }),
    );
  });

  it("returns null on non-OK HTTP response", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as typeof fetch;

    const result = await fetchParseCompletion("hello", "event", async () => "tok");
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    process.env.EXPO_PUBLIC_PARSE_API_URL = "https://parse.example";
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as typeof fetch;

    const result = await fetchParseCompletion("hello", "intake", async () => "tok");
    expect(result).toBeNull();
  });
});
