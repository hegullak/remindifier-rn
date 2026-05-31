import type { BriefSectionId } from "@/lib/brief/sections";

/** i18n path for a brief section heading. */
export function briefSectionLabelKey(sectionId: BriefSectionId): string {
  if (sectionId === "red_letter") return "brief.sections.redLetter";
  if (sectionId === "evening_wind_down") return "brief.sections.eveningWindDown";
  return `brief.sections.${sectionId}`;
}
