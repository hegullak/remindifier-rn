import type { BriefSectionId } from "@/lib/brief/sections";

/** i18n path for a brief section heading. */
export function briefSectionLabelKey(sectionId: BriefSectionId): string {
  if (sectionId === "red_letter") return "brief.sections.redLetter";
  return `brief.sections.${sectionId}`;
}
