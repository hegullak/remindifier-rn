import { parseEventInput } from "@/lib/gatherings/eventParser";

describe("parseEventInput", () => {
  const originalKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalKey) process.env.EXPO_PUBLIC_OPENAI_API_KEY = originalKey;
    else delete process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    global.fetch = originalFetch;
  });

  it("falls back to line-split topics without API key", async () => {
    const result = await parseEventInput("Ask about kids\nWatch the match");
    expect(result.talkingPoints).toHaveLength(2);
    expect(result.talkingPoints[0].kind).toBe("topic");
    expect(result.title).toBeNull();
    expect(result.rawInput).toBe("Ask about kids\nWatch the match");
  });

  it("returns empty talking points for blank input", async () => {
    const result = await parseEventInput("   ");
    expect(result.talkingPoints).toEqual([]);
  });

  it("parses structured API response when key is set", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Weekend with Ivan",
                talkingPoints: [
                  { kind: "question", text: "Ask about his kids" },
                  { kind: "watch", text: "Watch the match" },
                ],
                mentionedPeople: ["Ivan"],
              }),
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await parseEventInput("Helgebesøk Ivan. Spør om barna.");
    expect(result.title).toBe("Weekend with Ivan");
    expect(result.talkingPoints).toHaveLength(2);
    expect(result.talkingPoints[0].kind).toBe("question");
    expect(result.mentionedPeople).toEqual(["Ivan"]);
  });

  it("falls back when API returns error status", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    const result = await parseEventInput("Plan dinner");
    expect(result.talkingPoints[0].text).toBe("Plan dinner");
  });

  it("falls back when API response has refusal", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { refusal: "no", content: null } }],
      }),
    }) as unknown as typeof fetch;

    const result = await parseEventInput("Plan dinner");
    expect(result.talkingPoints[0].text).toBe("Plan dinner");
  });

  it("coerces invalid talking point kind to topic", async () => {
    process.env.EXPO_PUBLIC_OPENAI_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: null,
                talkingPoints: [{ kind: "invalid", text: "Something" }],
                mentionedPeople: [],
              }),
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await parseEventInput("Something");
    expect(result.talkingPoints[0].kind).toBe("topic");
  });
});
