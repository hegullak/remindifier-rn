export type ParsedPersonDraft = {
  displayName: string | null;
  relationType: string | null;
  birthday: string | null;
  birthdayYearKnown: boolean;
  funFacts: string[];
  pendingActions: string[];
  rawInput: string;
};

export const EMPTY_PARSED_PERSON_DRAFT: ParsedPersonDraft = {
  displayName: null,
  relationType: null,
  birthday: null,
  birthdayYearKnown: false,
  funFacts: [],
  pendingActions: [],
  rawInput: "",
};
