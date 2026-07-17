import {
  matchesIntentionText,
  mergeCarriedNotes,
  normalizeIntentionText,
} from "@/lib/brief/intentionThread";

describe("normalizeIntentionText", () => {
  it("lowercases, trims, collapses whitespace and strips edge punctuation", () => {
    expect(normalizeIntentionText("  Ringe  Tante Berit!  ")).toBe("ringe tante berit");
    expect(normalizeIntentionText("Klippe hekken.")).toBe("klippe hekken");
  });
});

describe("matchesIntentionText", () => {
  it("matches the same intention across occurrences despite casing/punctuation", () => {
    expect(matchesIntentionText("ringe tante Berit", "Ringe tante Berit!")).toBe(true);
  });

  it("does not match different intentions", () => {
    expect(matchesIntentionText("ringe tante Berit", "ringe mor")).toBe(false);
  });

  it("never matches empty text", () => {
    expect(matchesIntentionText("", "")).toBe(false);
  });
});

describe("mergeCarriedNotes", () => {
  it("puts fresh notes first, then carried lines", () => {
    expect(mergeCarriedNotes("Nytt punkt", "Fra sist")).toBe("Nytt punkt\nFra sist");
  });

  it("carries forward alone when no fresh notes exist", () => {
    expect(mergeCarriedNotes(undefined, "Hun skal til legen igjen")).toBe(
      "Hun skal til legen igjen",
    );
  });

  it("drops exact duplicate lines (case-insensitive)", () => {
    expect(mergeCarriedNotes("Spør om legen\nNytt", "spør om legen")).toBe("Spør om legen\nNytt");
  });

  it("returns null when nothing remains", () => {
    expect(mergeCarriedNotes("", null)).toBeNull();
    expect(mergeCarriedNotes("  \n ", "")).toBeNull();
  });
});
