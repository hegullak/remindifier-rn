import { clerkErrorMessage } from "@/features/auth/clerk/errors";

const FALLBACK = "Noe gikk galt.";

describe("clerkErrorMessage", () => {
  it("returns the first Clerk error message when present", () => {
    const error = { errors: [{ message: "Invalid password." }] };
    expect(clerkErrorMessage(error, FALLBACK)).toBe("Invalid password.");
  });

  it("uses fallback when errors array is empty", () => {
    expect(clerkErrorMessage({ errors: [] }, FALLBACK)).toBe(FALLBACK);
  });

  it("uses fallback when errors[0] has no message", () => {
    expect(clerkErrorMessage({ errors: [{}] }, FALLBACK)).toBe(FALLBACK);
  });

  it("returns locked-account message when error string contains 'locked'", () => {
    const result = clerkErrorMessage(new Error("account is locked"), FALLBACK);
    expect(result).toContain("låst");
  });

  it("returns locked-account message when error string contains 'account is locked'", () => {
    const result = clerkErrorMessage({ toString: () => "account is locked" }, FALLBACK);
    expect(result).toContain("låst");
  });

  it("returns fallback for plain Error without locked text", () => {
    expect(clerkErrorMessage(new Error("Network error"), FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback for null", () => {
    expect(clerkErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback for undefined", () => {
    expect(clerkErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback for plain string error", () => {
    expect(clerkErrorMessage("something broke", FALLBACK)).toBe(FALLBACK);
  });
});
