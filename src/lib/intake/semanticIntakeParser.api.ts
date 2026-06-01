import type { Locale } from "@/i18n/types";
import {
  buildFields,
  overallConfidence,
  parseSemanticIntakeLocal,
} from "@/lib/intake/semanticIntakeParser";
import type {
  IntakeConfidence,
  SemanticIntakeParseResult,
} from "@/lib/intake/semanticIntakeParser.types";
import {
  isGarbledFollowUpText,
  resolveIntakeTalkingPointKind,
} from "@/lib/intake/intakeTalkingPointKind";

type IntakeApiPayload = {
  eventTitle: string | null;
  personName: string | null;
  scheduledAtLabel: string | null;
  scheduledAtIso: string | null;
  scheduledAtOptions: Array<{ label: string; scheduledAtIso: string | null }>;
  followUps: Array<{ text: string; kind: string }>;
  ambiguities: string[];
  freeFormNote: string | null;
};

function asNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeTalkingPointKind(
  kind: string,
  text: string,
): "question" | "topic" | "headsup" {
  const parsed =
    kind === "question" || kind === "topic" || kind === "headsup" ? kind : undefined;
  return resolveIntakeTalkingPointKind(text, parsed);
}

function normalizeFollowUpItem(
  item: SemanticIntakeParseResult["followUps"][number],
): SemanticIntakeParseResult["followUps"][number] {
  return {
    ...item,
    talkingPointKind: resolveIntakeTalkingPointKind(
      item.text,
      item.talkingPointKind,
    ),
  };
}

/** Drop duplicates, subsets, and ASR mashups (e.g. hyttetur + gifter seg in one line). */
function dedupeFollowUps(
  followUps: SemanticIntakeParseResult["followUps"],
): SemanticIntakeParseResult["followUps"] {
  const normalized = followUps.map(normalizeFollowUpItem);
  const drop = new Set<number>();

  for (let i = 0; i < normalized.length; i++) {
    if (isGarbledFollowUpText(normalized[i].text)) {
      drop.add(i);
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    if (drop.has(i)) continue;
    for (let j = i + 1; j < normalized.length; j++) {
      if (drop.has(j)) continue;
      const a = normalized[i].text;
      const b = normalized[j].text;
      if (!followUpMatches(a, b)) continue;
      drop.add(a.length <= b.length ? i : j);
    }
  }

  return normalized.filter((_, index) => !drop.has(index));
}

function isGratulereOnly(text: string): boolean {
  return /^(husk å\s+)?gratulere\.?$/i.test(text.trim());
}

function isEngagementNews(text: string): boolean {
  return /gifter|forlovelse|bryllup|engasjement/i.test(text);
}

/** Merge bare "gratulere" / "husk å gratulere" with the engagement line (any order). */
export function mergeOrphanGratulereFollowUps(
  followUps: SemanticIntakeParseResult["followUps"],
): SemanticIntakeParseResult["followUps"] {
  const gratulereIdx = followUps.findIndex((f) => isGratulereOnly(f.text));
  const engagementIdx = followUps.findIndex((f) => isEngagementNews(f.text));
  if (gratulereIdx < 0 || engagementIdx < 0 || gratulereIdx === engagementIdx) {
    return followUps;
  }

  const engagement = followUps[engagementIdx];
  const mergedText = /gratulere/i.test(engagement.text)
    ? engagement.text
    : `${engagement.text.replace(/\s*—\s*$/, "")} — husk å gratulere`;

  return dedupeFollowUps(
    followUps
      .map((f, i) =>
        i === engagementIdx
          ? { ...f, text: mergedText, talkingPointKind: "headsup" as const }
          : f,
      )
      .filter((_, i) => i !== gratulereIdx),
  );
}

export function finalizeIntakePartial(
  partial: Omit<SemanticIntakeParseResult, "fields" | "overallConfidence">,
): SemanticIntakeParseResult {
  const ambiguities = [...partial.ambiguities];
  if (
    (partial.scheduledAtOptions?.length ?? 0) >= 2 &&
    !ambiguities.includes("datetime_conflict")
  ) {
    ambiguities.push("datetime_conflict");
  }

  const followUps = dedupeFollowUps(partial.followUps);
  const withAmbiguity = { ...partial, ambiguities, followUps };
  const fields = buildFields(withAmbiguity);
  return {
    ...withAmbiguity,
    fields,
    overallConfidence: overallConfidence(fields, ambiguities),
  };
}

/** Fill schedule/conflict from local parser when the API omits or under-specifies datetime. */
function followUpMatches(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (x === y) return true;
  if (x.length >= 8 && y.length >= 8 && (x.includes(y) || y.includes(x))) return true;
  return false;
}

/** Add topic/agenda bullets from local parser when the API omits them. */
function mergeMissingFollowUpsFromLocal(
  apiFollowUps: SemanticIntakeParseResult["followUps"],
  localFollowUps: SemanticIntakeParseResult["followUps"],
): SemanticIntakeParseResult["followUps"] {
  const merged = [...apiFollowUps];
  for (const local of localFollowUps) {
    if (merged.some((f) => followUpMatches(f.text, local.text))) continue;
    merged.push(local);
  }
  return mergeOrphanGratulereFollowUps(merged);
}

export function enrichIntakeWithLocalSchedule(
  api: SemanticIntakeParseResult,
  rawText: string,
  referenceDate: Date,
  locale: Locale,
): SemanticIntakeParseResult {
  const local = parseSemanticIntakeLocal(rawText, { referenceDate, locale });
  const localOptions = local.scheduledAtOptions ?? [];
  const apiOptions = api.scheduledAtOptions ?? [];

  let scheduledAt = api.scheduledAt;
  let scheduledAtOptions = api.scheduledAtOptions;
  const ambiguities = [...api.ambiguities];

  if (localOptions.length >= 2) {
    const apiHasUsableOptions =
      apiOptions.length >= 2 && apiOptions.every((o) => o.date != null);
    scheduledAt = null;
    scheduledAtOptions = apiHasUsableOptions ? apiOptions : localOptions;
    if (!ambiguities.includes("datetime_conflict")) {
      ambiguities.push("datetime_conflict");
    }
  } else if (!scheduledAt?.date && local.scheduledAt?.date) {
    scheduledAt = local.scheduledAt;
    scheduledAtOptions = undefined;
  }

  const followUps = mergeMissingFollowUpsFromLocal(api.followUps, local.followUps);

  return finalizeIntakePartial({
    ...api,
    ambiguities,
    scheduledAt,
    scheduledAtOptions,
    followUps,
  });
}

export function normalizeIntakeApiPayload(
  payload: unknown,
  rawText: string,
  _referenceDate: Date,
  _locale: Locale,
): SemanticIntakeParseResult | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as IntakeApiPayload;

  const ambiguities = Array.isArray(data.ambiguities)
    ? data.ambiguities.filter((a): a is string => typeof a === "string")
    : [];

  const followUpsRaw = Array.isArray(data.followUps)
    ? data.followUps
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const row = item as { text?: unknown; kind?: unknown };
          const text = asNullableString(row.text);
          if (!text) return null;
          return {
            text,
            confidence: "high" as const,
            talkingPointKind: normalizeTalkingPointKind(String(row.kind ?? "topic"), text),
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null)
    : [];
  const followUps = mergeOrphanGratulereFollowUps(followUpsRaw);

  const scheduledAtOptions = Array.isArray(data.scheduledAtOptions)
    ? data.scheduledAtOptions
        .filter((o) => o && typeof o === "object")
        .map((o) => {
          const row = o as { label?: unknown; scheduledAtIso?: unknown };
          const label = asNullableString(row.label);
          if (!label) return null;
          return {
            label,
            date: parseIsoDate(asNullableString(row.scheduledAtIso)),
            confidence: "high" as const,
          };
        })
        .filter((o): o is NonNullable<typeof o> => o !== null)
    : undefined;

  const scheduledLabel = asNullableString(data.scheduledAtLabel);
  const scheduledIso = asNullableString(data.scheduledAtIso);

  let scheduledAt: SemanticIntakeParseResult["scheduledAt"] = null;
  if (scheduledLabel || scheduledIso) {
    scheduledAt = {
      label: scheduledLabel ?? scheduledIso ?? "",
      date: parseIsoDate(scheduledIso),
      confidence: (scheduledLabel && scheduledIso ? "high" : "medium") as IntakeConfidence,
    };
  }

  const partial: Omit<SemanticIntakeParseResult, "fields" | "overallConfidence"> = {
    rawText,
    ambiguities,
    person: asNullableString(data.personName)
      ? { name: asNullableString(data.personName)!, confidence: "high" }
      : null,
    event: asNullableString(data.eventTitle)
      ? { title: asNullableString(data.eventTitle)!, confidence: "high" }
      : null,
    scheduledAt:
      scheduledAtOptions && scheduledAtOptions.length >= 2 ? null : scheduledAt,
    scheduledAtOptions:
      scheduledAtOptions && scheduledAtOptions.length >= 2 ? scheduledAtOptions : undefined,
    followUps,
    freeFormNote: asNullableString(data.freeFormNote),
  };

  if (!partial.event && !partial.person && followUps.length === 0 && !partial.freeFormNote) {
    return null;
  }

  return finalizeIntakePartial(partial);
}

export async function parseSemanticIntakeWithApi(
  rawInput: string,
  options: {
    referenceDate: Date;
    locale: Locale;
    completionJson: string;
  },
): Promise<SemanticIntakeParseResult | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(options.completionJson);
  } catch {
    return null;
  }

  return normalizeIntakeApiPayload(
    parsed,
    rawInput,
    options.referenceDate,
    options.locale,
  );
}
