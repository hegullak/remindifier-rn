export const LOOK_FORWARD_MAX_LENGTH = 120;

/** Local calendar date `YYYY-MM-DD`. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type DailyLookForwardRecord = {
  text: string | null;
  dismissed: boolean;
};

export function shouldShowLookForwardPrompt(record: DailyLookForwardRecord | null): boolean {
  if (!record) return true;
  if (record.dismissed) return false;
  if (record.text?.trim()) return false;
  return true;
}

export function lookForwardDisplayText(record: DailyLookForwardRecord | null): string | null {
  const trimmed = record?.text?.trim();
  if (!trimmed || record?.dismissed) return null;
  return trimmed;
}
