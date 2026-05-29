import type { ParsedPersonDraft } from "@/lib/people/naturalLanguageParser";

export function draftToFormInitial(draft: ParsedPersonDraft) {
  return {
    displayName: draft.displayName ?? "",
    relationType: draft.relationType,
    birthday: draft.birthday ?? "",
    birthdayYearKnown: draft.birthdayYearKnown,
    isSensitive: false,
    funFacts: draft.funFacts,
    redLetterDays: [],
  };
}
