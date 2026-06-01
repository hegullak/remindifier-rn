import { trainingLineFromString } from "@/lib/brief/pplTraining";

describe("pplTraining", () => {
  it("detects pull session from English training string", () => {
    expect(trainingLineFromString("Strength training: Pull")).toEqual({
      kind: "ppl",
      active: "pull",
    });
  });

  it("detects push from English string", () => {
    expect(trainingLineFromString("Strength training: Push")).toEqual({
      kind: "ppl",
      active: "push",
    });
  });

  it("leaves non-PPL text unchanged", () => {
    expect(trainingLineFromString("Løping 4×4-intervaller")).toEqual({
      kind: "text",
      text: "Løping 4×4-intervaller",
    });
  });
});
