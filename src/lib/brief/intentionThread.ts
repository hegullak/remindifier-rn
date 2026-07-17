/**
 * Threads intentions across occurrences by their text. The after-moment
 * capture ("noe verdt å huske til neste gang?") stored on a completed
 * intention is carried forward — invisibly — as talking points when a new
 * intention with matching text is created. The user never files anything;
 * the thread just remembers. Friction-first per the input contract: capture
 * happens where the thought already exists, structure is the app's job.
 */

/** Normalizes for matching: lowercase, collapsed whitespace, no edge punctuation. */
export function normalizeIntentionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,!?;:]+$/g, "");
}

/** True when two intention texts refer to the same recurring thread. */
export function matchesIntentionText(a: string, b: string): boolean {
  const na = normalizeIntentionText(a);
  const nb = normalizeIntentionText(b);
  return na.length > 0 && na === nb;
}

/**
 * Merges carried-forward after-note lines into freshly captured notes.
 * Fresh notes come first (they're top of mind); carried lines follow,
 * with exact duplicates dropped. Returns null when nothing remains.
 */
export function mergeCarriedNotes(
  freshNotes: string | null | undefined,
  carried: string | null | undefined,
): string | null {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const source of [freshNotes, carried]) {
    for (const raw of (source ?? "").split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines.join("\n") : null;
}
