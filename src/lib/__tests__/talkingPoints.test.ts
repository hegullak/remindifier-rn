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
    expect(talkingPointMeta("headsup").stripeColor).toBe("amber");
  });

  it("migrates legacy plan and watch kinds to headsup", () => {
    const legacy = serializeGatheringContent({
      talkingPoints: [
        { id: "1", kind: "plan", text: "Plan trip", done: false } as never,
        { id: "2", kind: "watch", text: "See match", done: false } as never,
      ],
    });
    const parsed = parseGatheringContent(legacy);
    expect(parsed.talkingPoints.every((p) => p.kind === "headsup")).toBe(true);
  });

  it("returns Norwegian kind labels", () => {
    expect(talkingPointLabel("smalltalk", "no")).toBe("Small-talk");
    expect(talkingPointLabel("headsup", "no")).toBe("Heads-up");
  });
});

describe("event parser privacy", () => {
  it("tracks event privacy notice", async () => {
    await markEventParserPrivacySeen();
    expect(await hasSeenEventParserPrivacy()).toBe(true);
  });
});
