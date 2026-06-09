/** echonote «guitar» palette — mirrored in global.css `.guitar` (keep in sync). */
export const GUITAR_CSS_VARS = {
  bg: "#0e0c0a",
  bg2: "#0b0906",
  card: "#181410",
  card2: "#221e18",
  border: "rgba(255, 220, 140, 0.1)",
  text1: "#f5f0e8",
  text2: "#b8a882",
  text3: "#6e5e40",
  accent: "#f59e0b",
  "accent-light": "rgba(245, 158, 11, 0.14)",
  green: "#84cc16",
  "green-light": "rgba(132, 204, 22, 0.14)",
  amber: "#fbbf24",
  "amber-light": "rgba(251, 191, 36, 0.14)",
  red: "#f87171",
  "red-light": "rgba(248, 113, 113, 0.14)",
  sage: "#a3a352",
  "sage-light": "rgba(163, 163, 82, 0.14)",
  dusk: "#c4a882",
  "dusk-light": "rgba(196, 168, 130, 0.14)",
  blue: "#60a5fa",
  "blue-light": "rgba(96, 165, 250, 0.12)",
  gold: "#f59e0b",
  "gold-light": "rgba(245, 158, 11, 0.14)",
} as const;

export type BriefStripeColor = "blue" | "amber" | "gold" | "green" | "dusk" | "sage" | "accent";

/** Resolved stripe colors per theme — inline hex avoids NativeWind bg-* on 3px strips. */
export const BRIEF_STRIPE_COLORS: Record<
  "sand" | "slate" | "guitar",
  Record<BriefStripeColor, string>
> = {
  sand: {
    blue: "#356B8C",
    amber: "#8F6C1E",
    gold: "#8F7A2C",
    green: "#3E7A5E",
    dusk: "#57506F",
    sage: "#466B55",
    accent: "#3E7FA6",
  },
  slate: {
    blue: "#9CCAE0",
    amber: "#D4A87D",
    gold: "#D4BA7A",
    green: "#7DD4A8",
    dusk: "#9D8DC0",
    sage: "#7DB89A",
    accent: "#7EB8D4",
  },
  guitar: {
    blue: "#60A5FA",
    amber: "#FBBF24",
    gold: "#F59E0B",
    green: "#84CC16",
    dusk: "#C4A882",
    sage: "#A3A352",
    accent: "#F59E0B",
  },
};

export const TAB_BAR_UI = {
  sand: {
    accent: "#3E7FA6",
    inactive: "#8C8578",
    bg: "rgba(227,223,214,0.95)",
    overlay: "rgba(227,223,214,0.18)",
  },
  slate: {
    accent: "#7EB8D4",
    inactive: "#7A8CAD",
    bg: "rgba(34,40,56,0.92)",
    overlay: "rgba(34,40,56,0.15)",
  },
  guitar: {
    accent: "#F59E0B",
    inactive: "#6E5E40",
    bg: "rgba(24,20,16,0.92)",
    overlay: "rgba(245,158,11,0.08)",
  },
} as const;
