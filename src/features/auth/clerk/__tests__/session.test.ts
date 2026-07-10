import type { SignInResource } from "@clerk/types";
import { resolveSignInStep } from "@/features/auth/clerk/session";

function mockSignIn(status: string, factors?: SignInResource["supportedSecondFactors"]) {
  return {
    status,
    createdSessionId: status === "complete" ? "sess_1" : null,
    supportedSecondFactors: factors,
    supportedFirstFactors: [],
  } as unknown as SignInResource;
}

describe("resolveSignInStep", () => {
  it("maps needs_client_trust to client_trust step", () => {
    const step = resolveSignInStep(
      mockSignIn("needs_client_trust", [
        { strategy: "email_code", emailAddressId: "idn_1", safeIdentifier: "h@example.com" },
      ]),
    );
    expect(step.kind).toBe("client_trust");
  });

  it("maps needs_second_factor to second_factor step", () => {
    const step = resolveSignInStep(mockSignIn("needs_second_factor"));
    expect(step.kind).toBe("second_factor");
  });
});
