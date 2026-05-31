export const BRIEF_SECTION_IDS = [
  "weather",
  "schedule",
  "calendar",
  "headsup",
  "training",
  "red_letter",
] as const;

export type BriefSectionId = (typeof BRIEF_SECTION_IDS)[number];

export const DEFAULT_BRIEF_SECTION_ORDER: BriefSectionId[] = [
  "weather",
  "schedule",
  "calendar",
  "headsup",
  "red_letter",
  "training",
];

export const BRIEF_SECTION_LABELS: Record<BriefSectionId, string> = {
  weather: "Weather",
  schedule: "Today's schedule",
  calendar: "My week",
  headsup: "Heads up this week",
  training: "Today's training",
  red_letter: "Red-letter days",
};

export function normalizeBriefSectionOrder(order: string[] | undefined): BriefSectionId[] {
  const valid = new Set(BRIEF_SECTION_IDS);
  const seen = new Set<BriefSectionId>();
  const result: BriefSectionId[] = [];

  for (const id of order ?? []) {
    if (!valid.has(id as BriefSectionId)) continue;
    const sid = id as BriefSectionId;
    if (seen.has(sid)) continue;
    seen.add(sid);
    result.push(sid);
  }

  for (const id of DEFAULT_BRIEF_SECTION_ORDER) {
    if (!seen.has(id)) result.push(id);
  }

  return result;
}
