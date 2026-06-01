/** Classify intake follow-up lines for gathering talking-point kinds. */
export function resolveIntakeTalkingPointKind(
  text: string,
  fromParser?: "question" | "topic" | "headsup",
): "question" | "topic" | "headsup" {
  const t = text.trim().toLowerCase();

  if (
    /\b(diskutere|hyttetur|snakke\s+om|påsken|tar med hva|hvem som tar|planlegge\s+tur)\b/i.test(t) ||
    /^diskutere\s+/i.test(text)
  ) {
    return "topic";
  }

  if (/\b(ta opp at|skylder)\b/i.test(t)) {
    return "question";
  }

  if (/\b(gifter|forlovelse|bryllup|gravid|døde|død|flytte|ny jobb)\b/i.test(t)) {
    return "headsup";
  }

  if (fromParser === "topic" || fromParser === "headsup") {
    return fromParser;
  }

  return "question";
}

export function isGarbledFollowUpText(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  const hasAgenda = /\b(tar med hva|hyttetur|diskutere)\b/i.test(t);
  const hasEngagement = /\b(gifter seg|gratulere|forlovelse)\b/i.test(t);
  return hasAgenda && hasEngagement;
}
