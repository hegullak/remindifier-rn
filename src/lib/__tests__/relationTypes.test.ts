import {
  parseRelationTypes,
  serializeRelationTypes,
  translateRelationType,
} from "@/i18n/relationTypes";

describe("relationTypes", () => {
  it("parses comma-separated canonical values", () => {
    expect(parseRelationTypes("Parent,Close friend")).toEqual(["Parent", "Close friend"]);
  });

  it("parses single legacy value", () => {
    expect(parseRelationTypes("Friend")).toEqual(["Friend"]);
  });

  it("serializes in chip order", () => {
    expect(serializeRelationTypes(["Close friend", "Parent"])).toBe("Parent,Close friend");
  });

  it("translates multiple with Norwegian conjunction", () => {
    expect(translateRelationType("Parent,Close friend", "no")).toBe("Forelder og Nær venn");
  });

  it("translates multiple with English conjunction", () => {
    expect(translateRelationType("Parent,Close friend", "en")).toBe("Parent and Close friend");
  });

  it("passes through unknown free-text values", () => {
    expect(translateRelationType("beste venn", "no")).toBe("beste venn");
  });

  it("returns null for empty", () => {
    expect(translateRelationType(null, "en")).toBeNull();
    expect(translateRelationType("  ", "en")).toBeNull();
  });
});
