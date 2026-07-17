import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";

/**
 * Mock mode (dev-only): fills empty days with events drawn from the user's
 * own real calendar history, so the Brief flow can be tested without
 * needing real events scheduled on every day.
 */

export type MockEventTemplate = {
  title: string;
  hour: number;
  minute: number;
  durationMinutes: number;
  allDay: boolean;
};

const MAX_TEMPLATES = 40;

/** Distinct (title, time-of-day) templates extracted from real calendar history. */
export function extractEventTemplates(events: CalendarBriefEvent[]): MockEventTemplate[] {
  const seen = new Set<string>();
  const templates: MockEventTemplate[] = [];
  for (const event of events) {
    const title = event.title.trim();
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const durationMinutes = event.endDate
      ? Math.max(15, Math.round((event.endDate.getTime() - event.startDate.getTime()) / 60000))
      : 60;
    templates.push({
      title,
      hour: event.startDate.getHours(),
      minute: event.startDate.getMinutes(),
      durationMinutes,
      allDay: event.allDay,
    });
    if (templates.length >= MAX_TEMPLATES) break;
  }
  return templates;
}

/** Deterministic PRNG seeded by a string — the same day always mocks the same way. */
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 1-3 mock events for a single day, deterministically picked from the pool. */
export function mockEventsForDay(date: Date, pool: MockEventTemplate[]): CalendarBriefEvent[] {
  if (pool.length === 0) return [];

  const dayKey = startOfDay(date).toISOString().slice(0, 10);
  const rand = seededRandom(dayKey);
  const count = Math.min(1 + Math.floor(rand() * 3), pool.length);
  const picks = [...pool].sort(() => rand() - 0.5).slice(0, count);

  const todayStart = startOfDay(new Date());
  const dayStart = startOfDay(date);
  const daysUntil = Math.round((dayStart.getTime() - todayStart.getTime()) / 86400000);

  return picks.map((template, i) => {
    const startDate = new Date(date);
    startDate.setHours(template.hour, template.minute, 0, 0);
    const endDate = template.allDay
      ? undefined
      : new Date(startDate.getTime() + template.durationMinutes * 60000);
    return {
      id: `mock-${dayKey}-${i}`,
      title: template.title,
      startDate,
      endDate,
      allDay: template.allDay,
      daysUntil,
      isToday: daysUntil === 0,
      calendarName: undefined,
    };
  });
}
