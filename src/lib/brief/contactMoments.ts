import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { intentionTalkingPoints, type OpenIntention } from "@/lib/brief/intentionWeave";

/**
 * Contact moments: a calendar event that names a person ("Kveld med Ivan",
 * "Kaffe med Marte") is a chance to be the one who remembered. This module
 * detects the name, gathers everything the intention threads know about that
 * person (open talking points + after-notes from completed intentions), and
 * phrases it as one discreet prep line. Per the being-seen principle: private
 * preparation, never scoring — the credit belongs to the user.
 */

export type AfterNoteThread = {
  /** The completed intention's text, e.g. "ringe Ivan". */
  text: string;
  afterNote: string;
};

export type ContactMoment = {
  eventTitle: string;
  name: string;
  points: string[];
};

const MAX_POINTS = 3;

/**
 * Extracts a person-name candidate from an event title: the capitalized
 * word(s) right after a contact preposition (med/hos/with/at).
 * "Kveld med Ivan" -> "Ivan"; "Middag hos Ida Berg" -> "Ida Berg".
 */
export function extractContactName(eventTitle: string): string | null {
  const match = eventTitle.match(
    /\b(?:med|hos|with)\s+((?:[A-ZÆØÅ][a-zæøåüéA-ZÆØÅ]*)(?:\s+[A-ZÆØÅ][a-zæøåüéA-ZÆØÅ]*)*)/u,
  );
  return match ? match[1] : null;
}

function mentionsName(text: string, name: string): boolean {
  return text.toLowerCase().includes(name.toLowerCase());
}

/**
 * Everything the intention threads know about a person: talking points from
 * open intentions mentioning the name, then after-notes from completed ones.
 * Old notes are not stale — a question remembered long after appreciates.
 */
export function gatherPointsForName(
  name: string,
  openIntentions: OpenIntention[],
  afterNoteThreads: AfterNoteThread[],
): string[] {
  const points: string[] = [];
  const seen = new Set<string>();

  function add(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    points.push(trimmed);
  }

  for (const intention of openIntentions) {
    if (!mentionsName(intention.text, name)) continue;
    for (const point of intentionTalkingPoints(intention)) add(point);
  }
  for (const thread of afterNoteThreads) {
    if (!mentionsName(thread.text, name)) continue;
    for (const line of thread.afterNote.split("\n")) add(line);
  }

  return points.slice(0, MAX_POINTS);
}

/**
 * First event in the focus day that names a person the threads know
 * something about. Timed events in start order; null when nothing matches.
 */
export function findContactMoment(
  focusEvents: CalendarBriefEvent[],
  openIntentions: OpenIntention[],
  afterNoteThreads: AfterNoteThread[],
): ContactMoment | null {
  const timed = focusEvents
    .filter((e) => !e.allDay)
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  for (const event of timed) {
    const name = extractContactName(event.title);
    if (!name) continue;
    const points = gatherPointsForName(name, openIntentions, afterNoteThreads);
    if (points.length > 0) {
      return { eventTitle: event.title, name, points };
    }
  }
  return null;
}

/** The discreet prep line: 'Før «Kveld med Ivan» i morgen — verdt å huske: …' */
export function buildContactMomentLine(
  moment: ContactMoment,
  locale: "en" | "no",
  dayRef: "today" | "tomorrow",
): string {
  const points = moment.points.join(" · ");
  if (locale === "no") {
    const when = dayRef === "tomorrow" ? "i morgen" : "i dag";
    return `Før «${moment.eventTitle}» ${when} — verdt å huske: ${points}.`;
  }
  const when = dayRef === "tomorrow" ? "tomorrow" : "today";
  return `Before "${moment.eventTitle}" ${when} — worth remembering: ${points}.`;
}
