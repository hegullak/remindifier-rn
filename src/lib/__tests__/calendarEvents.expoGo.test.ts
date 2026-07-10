import { fetchCalendarBriefEvents } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";

jest.mock("@/lib/brief/calendarAccess", () => ({
  calendarRequiresDevBuild: jest.fn(() => true),
}));

jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: { EVENT: "event" },
}));

describe("fetchCalendarBriefEvents in Expo Go", () => {
  it("skips native calendar APIs and returns expo_go access", async () => {
    const { events, access } = await fetchCalendarBriefEvents(getCalendarWeekBounds());
    expect(access).toBe("expo_go");
    expect(events.some((e) => e.id.startsWith("dev-stub-"))).toBe(true);
  });
});
