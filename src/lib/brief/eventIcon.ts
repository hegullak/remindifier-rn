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
  { icon: "🏋️", keywords: ["styrke", "strength"] },
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

// Trailing emoji (incl. variation selectors / ZWJ sequences) at end of a title.
const TRAILING_EMOJI =
  /\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}](?:[\u{FE0F}\u{200D}\u{1F300}-\u{1FAFF}])*)\s*$/u;

/**
 * Resolves icon + display title for an event:
 * - if the title ends with an emoji, use it as the icon and strip it from the title
 *   (avoids "Helgebesøk Ivan 🏡" + 🕐 double-icon)
 * - otherwise fall back to keyword-based eventIcon
 */
export function iconAndTitle(title: string): { icon: string; title: string } {
  const match = title.match(TRAILING_EMOJI);
  if (match && match.index !== undefined) {
    const clean = title.slice(0, match.index).trim();
    if (clean) return { icon: match[1].trim(), title: clean };
  }
  return { icon: eventIcon(title), title };
}
