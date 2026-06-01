/**
 * Maps an event title to a contextual emoji icon.
 * Curated keyword set — everything unrecognized falls back to the clock.
 * Keep this list short and recognizable to avoid emoji noise.
 */
const ICON_RULES: { icon: string; keywords: string[] }[] = [
  { icon: "☕", keywords: ["kaffe", "coffee"] },
  { icon: "🥗", keywords: ["lunsj", "lunch"] },
  { icon: "🍽️", keywords: ["middag", "dinner", "frokost", "breakfast"] },
  { icon: "🦷", keywords: ["tannlege", "dentist"] },
  { icon: "🩺", keywords: ["lege", "legetime", "doctor", "helse"] },
  { icon: "⚽", keywords: ["fotball", "football", "kamp"] },
  { icon: "🏃", keywords: ["løp", "trening", "intervall", "gym", "run", "workout"] },
  { icon: "✈️", keywords: ["fly", "reise", "flight", "travel"] },
  { icon: "🎉", keywords: ["fest", "feiring", "party", "bursdag", "birthday"] },
];

const DEFAULT_ICON = "🕐";

export function eventIcon(title: string | null | undefined): string {
  if (!title) return DEFAULT_ICON;
  const lower = title.toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.icon;
  }
  return DEFAULT_ICON;
}
