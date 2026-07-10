import { getClerkInstance } from "@clerk/clerk-expo";
import type { SetActive, SignInResource } from "@clerk/types";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/types";

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
  | { kind: "client_trust"; signIn: SignInResource }
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
  if ((status as string | null) === "needs_client_trust") {
    return { kind: "client_trust", signIn };
  }
  if (status === "needs_first_factor") {
    return { kind: "first_factor", signIn };
  }
  return { kind: "unsupported", status };
}

export function signInStatusMessage(status: string | null, locale: Locale) {
  switch (status) {
    case "needs_new_password":
      return translate(locale, "signInForm.needsNewPassword");
    case "needs_identifier":
      return translate(locale, "signInForm.needsIdentifier");
    case "needs_client_trust":
      return translate(locale, "signInForm.confirmDevice");
    default:
      return status
        ? translate(locale, "signInForm.statusStopped", { status })
        : translate(locale, "signInForm.signInIncomplete");
  }
}
