import type { Calendar as CalendarType, Source } from "expo-calendar";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

/** Display name of the app-owned, writable device calendar. */
export const ECHO_CALENDAR_TITLE = "echoflow";

/** Slate accent — matches the app's brand color for the calendar dot in iOS Calendar. */
const ECHO_CALENDAR_COLOR = "#7EB8D4";

export async function findEchoCalendar(): Promise<CalendarType | null> {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return all.find((c) => c.title === ECHO_CALENDAR_TITLE) ?? null;
}

/**
 * On iOS, a new calendar must belong to a source (account). We prefer the
 * on-device "local" source so the echoflow calendar never syncs to iCloud —
 * consistent with the app's local-first stance. Falls back to whatever
 * source owns the user's default calendar if no local source is exposed.
 */
async function resolveIosSource(): Promise<Source> {
  const sources = await Calendar.getSourcesAsync();
  const local = sources.find((s) => s.type === Calendar.SourceType.LOCAL);
  if (local) return local;
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

async function resolveSource(): Promise<Source> {
  if (Platform.OS === "ios") return resolveIosSource();
  return { isLocalAccount: true, name: ECHO_CALENDAR_TITLE, type: "" };
}

/** Finds the existing echoflow calendar or creates it. Idempotent — safe to call before every sync. */
export async function getOrCreateEchoCalendarId(): Promise<string> {
  const existing = await findEchoCalendar();
  if (existing) return existing.id;

  const source = await resolveSource();
  return Calendar.createCalendarAsync({
    title: ECHO_CALENDAR_TITLE,
    color: ECHO_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    name: ECHO_CALENDAR_TITLE,
    ownerAccount: "personal",
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}
