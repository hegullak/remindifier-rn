import {
  localDateKey,
  lookForwardDisplayText,
  shouldShowLookForwardPrompt,
} from "@/lib/brief/lookForward";

describe("lookForward", () => {
  it("formats local date key", () => {
    expect(localDateKey(new Date(2026, 5, 10, 15, 30))).toBe("2026-06-10");
  });

  it("shows prompt when no record", () => {
    expect(shouldShowLookForwardPrompt(null)).toBe(true);
  });

  it("hides prompt after dismiss or save", () => {
    expect(shouldShowLookForwardPrompt({ text: null, dismissed: true })).toBe(false);
    expect(shouldShowLookForwardPrompt({ text: "VM i dag", dismissed: false })).toBe(false);
  });

  it("shows prompt any time of day when unset", () => {
    expect(shouldShowLookForwardPrompt(null)).toBe(true);
  });

  it("returns display text when saved", () => {
    expect(lookForwardDisplayText({ text: "  Fotball-VM  ", dismissed: false })).toBe("Fotball-VM");
    expect(lookForwardDisplayText({ text: null, dismissed: true })).toBeNull();
  });
});
