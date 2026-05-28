const MS_PER_DAY = 86_400_000;

export function nextBirthdayOccurrence(
  birthday: string,
  today: Date,
): { nextDate: Date; daysUntil: number } | null {
  const m = birthday.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const todayY = today.getFullYear();
  const todayMs = today.setHours(0, 0, 0, 0);

  let candidate = new Date(todayY, month - 1, day);
  let daysUntil = Math.round((candidate.getTime() - todayMs) / MS_PER_DAY);

  if (daysUntil < 0) {
    candidate = new Date(todayY + 1, month - 1, day);
    daysUntil = Math.round((candidate.getTime() - todayMs) / MS_PER_DAY);
  }

  return { nextDate: candidate, daysUntil };
}
