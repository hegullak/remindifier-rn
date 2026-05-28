export type DayPeriod = "morning" | "afternoon" | "evening";

export function dayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function briefGreetingLine(firstName: string, date = new Date()): string {
  const period = dayPeriod(date);
  const name = firstName.trim() || "there";
  return `Good ${period},\n${name}.`;
}
