import { resolveIntakeTalkingPointKind } from "@/lib/intake/intakeTalkingPointKind";

describe("resolveIntakeTalkingPointKind", () => {
  it("classifies agenda lines as topic even when parser said question", () => {
    expect(resolveIntakeTalkingPointKind("diskutere hyttetur i påsken", "question")).toBe("topic");
  });

  it("classifies ta opp / skylder as question", () => {
    expect(
      resolveIntakeTalkingPointKind("ta opp at Jonas skylder meg 500 kr fra sist", "headsup"),
    ).toBe("question");
  });
});
