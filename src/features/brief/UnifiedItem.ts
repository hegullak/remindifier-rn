/** A calendar event, demo schedule row, or red-letter/headsup item — normalized for list rendering. */
export type UnifiedItem = {
  id: string;
  /** daysUntil for week items; always 0 for single-day items. */
  sortKey: number;
  /** Minute-of-day, for chronological ordering within a day. */
  sortMinutes?: number;
  dayLabel: string;
  icon: string;
  primary: string;
  secondary?: string;
  note?: string;
  onPress?: () => void;
};
