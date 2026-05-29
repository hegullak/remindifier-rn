import {
  parseGatheringContent,
  serializeGatheringContent,
  talkingPointLabel,
  talkingPointMeta,
} from "@/lib/gatherings/talkingPoints";
import {
  hasSeenEventParserPrivacy,
  markEventParserPrivacySeen,
} from "@/lib/people/naturalLanguageParser.privacy";

describe("talkingPoints", () => {
  it("parses legacy newline description as topics", () => {
    const content = parseGatheringContent("Ask about kids\nPlan summer trip");
    expect(content.talkingPoints).toHaveLength(2);
    expect(content.talkingPoints[0].kind).toBe("topic");
    expect(content.talkingPoints[0].text).toBe("Ask about kids");
  });

  it("round-trips JSON content", () => {
    const original = {
      talkingPoints: [
        { id: "tp-1", kind: "question" as const, text: "How did the interview go?", done: false },
      ],
    };
    const parsed = parseGatheringContent(serializeGatheringContent(original));
    expect(parsed.talkingPoints[0].text).toBe("How did the interview go?");
    expect(parsed.talkingPoints[0].kind).toBe("question");
  });

  it("returns empty content for null description", () => {
    expect(parseGatheringContent(null).talkingPoints).toEqual([]);
  });

  it("returns meta stripe colors per kind", () => {
    expect(talkingPointMeta("topic").stripeColor).toBe("accent");
    expect(talkingPointMeta("question").stripeColor).toBe("dusk");
  });

  it("returns Norwegian kind labels", () => {
    expect(talkingPointLabel("watch", "no")).toBe("Se · Gjøre");
  });
});

describe("event parser privacy", () => {
  it("tracks event privacy notice", async () => {
    await markEventParserPrivacySeen();
    expect(await hasSeenEventParserPrivacy()).toBe(true);
  });
});
