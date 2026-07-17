/** Which device calendar IDs the user wants in the brief (read-only). `undefined` = all available. */
export type SavedCalendarSelection = string[] | undefined;

export function pickCalendarsForBrief<T extends { id: string }>(
  available: T[],
  selectedIds: SavedCalendarSelection,
): T[] {
  if (selectedIds === undefined) return available;
  const selected = new Set(selectedIds);
  return available.filter((calendar) => selected.has(calendar.id));
}

export function isCalendarEnabled(
  calendarId: string,
  selectedIds: SavedCalendarSelection,
  _allCalendarIds: string[],
): boolean {
  if (selectedIds === undefined) return true;
  return selectedIds.includes(calendarId);
}

export function toggleCalendarId(
  selectedIds: SavedCalendarSelection,
  allCalendarIds: string[],
  calendarId: string,
  enabled: boolean,
): string[] {
  const base = selectedIds ?? allCalendarIds;
  const next = new Set(base);
  if (enabled) next.add(calendarId);
  else next.delete(calendarId);
  return [...next];
}
