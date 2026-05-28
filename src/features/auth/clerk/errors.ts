export function clerkErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "errors" in error) {
    const first = (error as { errors?: Array<{ message?: string }> }).errors?.[0]?.message;
    if (first) return first;
  }
  const asString = String(error);
  if (asString.includes("account is locked") || asString.includes("locked")) {
    return "Kontoen er midlertidig låst etter for mange feil forsøk. Vent litt, eller lås opp brukeren i Clerk Dashboard → Users.";
  }
  return fallback;
}
