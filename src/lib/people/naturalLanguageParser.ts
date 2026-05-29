import { BIRTHDAY_SENTINEL_YEAR } from "@/lib/red-letter-day";

export type ParsedPersonDraft = {
  displayName: string | null;
  relationType: string | null;
  birthday: string | null;
  birthdayYearKnown: boolean;
  funFacts: string[];
  rawInput: string;
};

const MONTH_BY_NAME: Record<string, number> = {
  jan: 1,
  januar: 1,
  january: 1,
  feb: 2,
  februar: 2,
  february: 2,
  mar: 3,
  mars: 3,
  march: 3,
  apr: 4,
  april: 4,
  mai: 5,
  may: 5,
  jun: 6,
  juni: 6,
  june: 6,
  jul: 7,
  juli: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  okt: 10,
  oct: 10,
  oktober: 10,
  october: 10,
  nov: 11,
  november: 11,
  des: 12,
  dec: 12,
  desember: 12,
  december: 12,
};

type RelationEntry = { pattern: RegExp; labelNo: string; labelEn: string };

const RELATION_ENTRIES: RelationEntry[] = [
  { pattern: /\b(bestemor|grandmother|grandma)\b/gi, labelNo: "bestemor", labelEn: "grandmother" },
  { pattern: /\b(bestefar|grandfather|grandpa)\b/gi, labelNo: "bestefar", labelEn: "grandfather" },
  { pattern: /\b(svigermor|mother-in-law)\b/gi, labelNo: "svigermor", labelEn: "mother-in-law" },
  { pattern: /\b(svigerfar|father-in-law)\b/gi, labelNo: "svigerfar", labelEn: "father-in-law" },
  {
    pattern: /\b(kjæresten?|partner|boyfriend|girlfriend)\b/gi,
    labelNo: "kjæreste",
    labelEn: "partner",
  },
  { pattern: /\b(søsteren?|sister)\b/gi, labelNo: "søster", labelEn: "sister" },
  { pattern: /\b(broren?|brother)\b/gi, labelNo: "bror", labelEn: "brother" },
  { pattern: /\b(moren?|mor|mother|mamma|mom)\b/gi, labelNo: "mor", labelEn: "mother" },
  { pattern: /\b(faren?|far|father|pappa|dad)\b/gi, labelNo: "far", labelEn: "father" },
  { pattern: /\b(datteren?|daughter)\b/gi, labelNo: "datter", labelEn: "daughter" },
  { pattern: /\b(sønnen?|son)\b/gi, labelNo: "sønn", labelEn: "son" },
  { pattern: /\b(kona|kone|wife)\b/gi, labelNo: "kone", labelEn: "wife" },
  { pattern: /\b(mannen?|husband)\b/gi, labelNo: "mann", labelEn: "husband" },
  { pattern: /\b(onkelen?|onkel|uncle)\b/gi, labelNo: "onkel", labelEn: "uncle" },
  { pattern: /\b(tanten?|tante|aunt)\b/gi, labelNo: "tante", labelEn: "aunt" },
  {
    pattern: /\b(fetteren?|fetter|kusinen?|kusine|cousin)\b/gi,
    labelNo: "fetter",
    labelEn: "cousin",
  },
  { pattern: /\b(niesen?|niese|niece)\b/gi, labelNo: "niese", labelEn: "niece" },
  { pattern: /\b(nevøen?|nevø|nephew)\b/gi, labelNo: "nevø", labelEn: "nephew" },
  {
    pattern: /\b(kollegaen?|kollega|colleague|coworker)\b/gi,
    labelNo: "kollega",
    labelEn: "colleague",
  },
  { pattern: /\b(vennen?|venn|friend)\b/gi, labelNo: "venn", labelEn: "friend" },
  { pattern: /\b(mentoren?|mentor)\b/gi, labelNo: "mentor", labelEn: "mentor" },
  {
    pattern: /\b(bekjenten?|bekjent|acquaintance)\b/gi,
    labelNo: "bekjent",
    labelEn: "acquaintance",
  },
];

function preferNorwegianLabels(text: string): boolean {
  return (
    /[æøå]/i.test(text) || /\b(er|heter|bursdag|søster|bror|mor|far|venn|kollega)\b/i.test(text)
  );
}

const STOP_WORDS = new Set([
  "er",
  "is",
  "min",
  "mitt",
  "mine",
  "my",
  "the",
  "og",
  "and",
  "a",
  "an",
  "en",
  "et",
  "ei",
  "den",
  "det",
  "de",
  "hun",
  "han",
  "ho",
  "jeg",
  "i",
  "som",
  "at",
  "named",
  "heter",
  "called",
  "bursdag",
  "birthday",
  "born",
  "født",
  "fodt",
]);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const UNKNOWN_BIRTH_YEAR = 1;

function toIsoDate(year: number, month: number, day: number, yearKnown: boolean): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const y = yearKnown ? year : UNKNOWN_BIRTH_YEAR;
  const probe = new Date(y, month - 1, day);
  if (probe.getMonth() !== month - 1 || probe.getDate() !== day) return null;
  const yearPart = yearKnown ? String(year) : BIRTHDAY_SENTINEL_YEAR;
  return `${yearPart}-${pad2(month)}-${pad2(day)}`;
}

function parseMonthName(token: string | undefined): number | null {
  if (!token) return null;
  return MONTH_BY_NAME[token.toLowerCase().replace(/[.,]/g, "")] ?? null;
}

const MONTH_NAME_PATTERN =
  "jan(?:uary|uar)?|feb(?:ruary|ruar)?|mar(?:ch|s)?|apr(?:il)?|mai|may|jun(?:e|i)?|jul(?:y|i)?|aug(?:ust)?|sep(?:t(?:ember)?)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|des(?:ember)?|dec(?:ember)?";

type BirthdayHit = { iso: string; yearKnown: boolean; match: string };

function extractBirthday(text: string): { birthday: BirthdayHit | null; rest: string } {
  let rest = text;
  let hit: BirthdayHit | null = null;

  const isoMatch = rest.match(/\b((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const iso = toIsoDate(year, month, day, true);
    if (iso) {
      hit = { iso, yearKnown: true, match: isoMatch[0] };
      rest = rest.replace(isoMatch[0], " ");
    }
  }

  if (!hit) {
    const dmyNumeric = rest.match(/\b(\d{1,2})[./](\d{1,2})(?:[./]((?:19|20)\d{2}))?\b/);
    if (dmyNumeric) {
      const day = Number(dmyNumeric[1]);
      const month = Number(dmyNumeric[2]);
      const yearKnown = Boolean(dmyNumeric[3]);
      const year = yearKnown ? Number(dmyNumeric[3]) : UNKNOWN_BIRTH_YEAR;
      const iso = toIsoDate(year, month, day, yearKnown);
      if (iso) {
        hit = { iso, yearKnown, match: dmyNumeric[0] };
        rest = rest.replace(dmyNumeric[0], " ");
      }
    }
  }

  if (!hit) {
    const dayMonthWords = rest.match(
      new RegExp(`\\b(\\d{1,2})\\.?\\s*(${MONTH_NAME_PATTERN})(?:\\s+((?:19|20)\\d{2}))?\\b`, "i"),
    );
    if (dayMonthWords) {
      const day = Number(dayMonthWords[1]);
      const month = parseMonthName(dayMonthWords[2]);
      const yearKnown = Boolean(dayMonthWords[3]);
      const year = yearKnown ? Number(dayMonthWords[3]) : UNKNOWN_BIRTH_YEAR;
      if (month) {
        const iso = toIsoDate(year, month, day, yearKnown);
        if (iso) {
          hit = { iso, yearKnown, match: dayMonthWords[0] };
          rest = rest.replace(dayMonthWords[0], " ");
        }
      }
    }
  }

  if (!hit) {
    const monthDayWords = rest.match(
      new RegExp(
        `\\b(${MONTH_NAME_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+((?:19|20)\\d{2}))?\\b`,
        "i",
      ),
    );
    if (monthDayWords) {
      const month = parseMonthName(monthDayWords[1]);
      const day = Number(monthDayWords[2]);
      const yearKnown = Boolean(monthDayWords[3]);
      const year = yearKnown ? Number(monthDayWords[3]) : UNKNOWN_BIRTH_YEAR;
      if (month) {
        const iso = toIsoDate(year, month, day, yearKnown);
        if (iso) {
          hit = { iso, yearKnown, match: monthDayWords[0] };
          rest = rest.replace(monthDayWords[0], " ");
        }
      }
    }
  }

  if (!hit) {
    const hintThenDate = rest.match(
      /\b(?:bursdag|birthday|born|født|fodt|fyller\s+år|fyller\s+ar|turns)\s*[:-]?\s*(\d{1,2})\.?\s*([a-zæøåé.]+)(?:\s+((?:19|20)\d{2}))?/i,
    );
    if (hintThenDate) {
      const day = Number(hintThenDate[1]);
      const month = parseMonthName(hintThenDate[2]);
      const yearKnown = Boolean(hintThenDate[3]);
      const year = yearKnown ? Number(hintThenDate[3]) : UNKNOWN_BIRTH_YEAR;
      if (month) {
        const iso = toIsoDate(year, month, day, yearKnown);
        if (iso) {
          hit = { iso, yearKnown, match: hintThenDate[0] };
          rest = rest.replace(hintThenDate[0], " ");
        }
      }
    }
  }

  rest = rest.replace(
    /\b(?:bursdag|birthday|born|født|fodt|fyller\s+år|fyller\s+ar|turns)\b/gi,
    " ",
  );
  return { birthday: hit, rest: normalizeSpaces(rest) };
}

function extractRelation(text: string): { relation: string | null; rest: string } {
  const useNo = preferNorwegianLabels(text);
  for (const entry of RELATION_ENTRIES) {
    entry.pattern.lastIndex = 0;
    const match = entry.pattern.exec(text);
    if (match) {
      return {
        relation: useNo ? entry.labelNo : entry.labelEn,
        rest: normalizeSpaces(text.replace(match[0], " ")),
      };
    }
  }
  return { relation: null, rest: text };
}

function extractName(text: string): { name: string | null; rest: string } {
  const namedMatch = text.match(
    /\b(?:heter|named|called)\s+([A-ZÆØÅ][\wæøåéÆØÅÉ'-]*(?:\s+[A-ZÆØÅ][\wæøåéÆØÅÉ'-]*)*)/iu,
  );
  if (namedMatch) {
    return {
      name: namedMatch[1].trim(),
      rest: normalizeSpaces(text.replace(namedMatch[0], " ")),
    };
  }

  const erMatch = text.match(
    /^([A-ZÆØÅ][\wæøåéÆØÅÉ'-]*(?:\s+[A-ZÆØÅ][\wæøåéÆØÅÉ'-]*)*)\s+(?:er|is)\b/iu,
  );
  if (erMatch) {
    return {
      name: erMatch[1].trim(),
      rest: normalizeSpaces(text.replace(erMatch[0], " ")),
    };
  }

  const leadingName = text.match(/^([A-ZÆØÅ][\wæøåéÆØÅÉ'-]+)/u);
  if (leadingName) {
    return {
      name: leadingName[1].trim(),
      rest: normalizeSpaces(text.replace(leadingName[0], " ")),
    };
  }

  return { name: null, rest: text };
}

function normalizeSpaces(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

function extractFunFacts(text: string): string[] {
  const chunks = text
    .split(/[,;.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const facts: string[] = [];
  for (const chunk of chunks) {
    const words = chunk.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    const cleaned = words.join(" ").trim();
    if (cleaned.length >= 3) facts.push(cleaned);
  }
  return facts;
}

export function parseNaturalPersonInput(input: string): ParsedPersonDraft {
  const rawInput = input.trim();
  if (!rawInput) {
    return {
      displayName: null,
      relationType: null,
      birthday: null,
      birthdayYearKnown: false,
      funFacts: [],
      rawInput,
    };
  }

  let working = normalizeSpaces(rawInput.replace(/[,;]+/g, ", "));

  const { birthday: birthdayHit, rest: afterBirthday } = extractBirthday(working);
  working = afterBirthday;

  const { relation, rest: afterRelation } = extractRelation(working);
  working = afterRelation;

  const { name, rest: afterName } = extractName(working);
  working = afterName;

  const funFacts = extractFunFacts(working);

  return {
    displayName: name,
    relationType: relation,
    birthday: birthdayHit?.iso ?? null,
    birthdayYearKnown: birthdayHit?.yearKnown ?? false,
    funFacts,
    rawInput,
  };
}
