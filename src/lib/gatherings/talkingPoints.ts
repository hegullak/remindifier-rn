import * as Crypto from "expo-crypto";

export type TalkingPointKind = "topic" | "question" | "plan" | "watch" | "smalltalk";

export type TalkingPoint = {
  id: string;
  kind: TalkingPointKind;
  text: string;
  done: boolean;
};

export type GatheringContent = {
  talkingPoints: TalkingPoint[];
};

export const TALKING_POINT_KINDS: TalkingPointKind[] = [
  "topic",
  "question",
  "plan",
  "watch",
  "smalltalk",
];

type TalkingPointMeta = {
  icon: string;
  stripeColor: "accent" | "dusk" | "green" | "amber" | "sage";
  label_en: string;
  label_no: string;
};

const META: Record<TalkingPointKind, TalkingPointMeta> = {
  topic: { icon: "💬", stripeColor: "accent", label_en: "Topic", label_no: "Tema" },
  question: { icon: "❓", stripeColor: "dusk", label_en: "Ask", label_no: "Spør" },
  plan: { icon: "📋", stripeColor: "green", label_en: "Plan", label_no: "Plan" },
  watch: { icon: "🎬", stripeColor: "amber", label_en: "Watch · Do", label_no: "Se · Gjøre" },
  smalltalk: { icon: "☕", stripeColor: "sage", label_en: "Small talk", label_no: "Samtaleemne" },
};

export function talkingPointMeta(kind: TalkingPointKind): TalkingPointMeta {
  return META[kind];
}

export function talkingPointLabel(kind: TalkingPointKind, locale: "en" | "no"): string {
  const meta = META[kind];
  return locale === "no" ? meta.label_no : meta.label_en;
}

export function parseGatheringContent(description: string | null): GatheringContent {
  if (!description?.trim()) return { talkingPoints: [] };

  try {
    const parsed = JSON.parse(description) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as GatheringContent).talkingPoints)
    ) {
      const talkingPoints = (parsed as GatheringContent).talkingPoints
        .filter((p) => p && typeof p.text === "string" && p.text.trim())
        .map((p) => ({
          id: typeof p.id === "string" && p.id ? p.id : Crypto.randomUUID(),
          kind: TALKING_POINT_KINDS.includes(p.kind) ? p.kind : "topic",
          text: p.text.trim(),
          done: Boolean(p.done),
        }));
      return { talkingPoints };
    }
  } catch {
    // fall through to legacy plain text
  }

  const talkingPoints = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({
      id: Crypto.randomUUID(),
      kind: "topic" as const,
      text,
      done: false,
    }));

  return { talkingPoints };
}

export function serializeGatheringContent(content: GatheringContent): string {
  return JSON.stringify(content);
}

export function emptyGatheringContent(): GatheringContent {
  return { talkingPoints: [] };
}
