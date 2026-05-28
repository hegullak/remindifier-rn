import { getClerkInstance } from "@clerk/clerk-expo";
import type { SetActive, SignInResource } from "@clerk/types";

export function isSessionExistsError(error: unknown) {
  const msg =
    typeof error === "object" && error !== null && "errors" in error
      ? (error as { errors?: Array<{ message?: string; code?: string }> }).errors
          ?.map((e) => `${e.code ?? ""} ${e.message ?? ""}`)
          .join(" ")
      : String(error);
  const lower = (msg ?? "").toLowerCase();
  return lower.includes("session already exists") || lower.includes("session_exists");
}

/** Wait until Clerk has an active session after setActive (avoids tabs redirect race). */
export async function activateClerkSession(
  setActive: SetActive,
  sessionId: string,
  maxWaitMs = 10_000,
): Promise<boolean> {
  await setActive({ session: sessionId });

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const session = getClerkInstance().session;
    if (session?.id) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

export type SignInFlowStep =
  | { kind: "complete"; sessionId: string }
  | { kind: "second_factor"; signIn: SignInResource }
  | { kind: "first_factor"; signIn: SignInResource }
  | { kind: "unsupported"; status: string | null };

/** Prefer the object returned from `signIn.create()` — hook state can lag one tick behind. */
export function resolveSignInStep(signIn: SignInResource): SignInFlowStep {
  const status = signIn.status ?? null;
  const sessionId = signIn.createdSessionId ?? null;

  if (__DEV__) {
    console.log("[remindifier auth] signIn status:", status, "session:", sessionId ?? "none");
  }

  if (status === "complete" && sessionId) {
    return { kind: "complete", sessionId };
  }
  if (status === "needs_second_factor") {
    return { kind: "second_factor", signIn };
  }
  if (status === "needs_first_factor") {
    return { kind: "first_factor", signIn };
  }
  return { kind: "unsupported", status };
}

export function signInStatusMessage(status: string | null) {
  switch (status) {
    case "needs_new_password":
      return "Du må sette et nytt passord i Clerk Dashboard.";
    case "needs_identifier":
      return "Skriv inn e-postadressen din.";
    default:
      return status
        ? `Innloggingen stoppet med status «${status}». Sjekk Clerk-innstillinger eller prøv igjen.`
        : "Innloggingen fullførte ikke. Prøv igjen.";
  }
}
