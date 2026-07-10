import * as Calendar from "expo-calendar";
import { PermissionStatus } from "expo-modules-core";
import { fetchCalendarBriefEvents } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";

jest.mock("@/lib/brief/calendarAccess", () => ({
  calendarRequiresDevBuild: jest.fn(() => false),
}));

jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: { EVENT: "event" },
}));

const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe("fetchCalendarBriefEvents", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });
  });

  it("returns denied access when permission is denied", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    await expect(fetchCalendarBriefEvents()).resolves.toEqual({
      events: [],
      access: "denied",
    });

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("returns sorted events from all calendars", async () => {
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-1", title: "Privat" } as never,
      { id: "cal-2", title: "Jobb" } as never,
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const later = new Date(today);
    later.setDate(later.getDate() + 2);
    later.setHours(16, 0, 0, 0);
    const sooner = new Date(today);
    sooner.setDate(sooner.getDate() + 1);
    sooner.setHours(10, 0, 0, 0);

    mockCalendar.getEventsAsync.mockResolvedValue([
      {
        id: "b",
        title: "Later",
        startDate: later.toISOString(),
        endDate: later.toISOString(),
        allDay: false,
        calendarId: "cal-1",
      } as never,
      {
        id: "a",
        title: "Sooner",
        startDate: sooner.toISOString(),
        endDate: sooner.toISOString(),
        allDay: true,
        calendarId: "cal-2",
      } as never,
    ]);

    const weekBounds = getCalendarWeekBounds();
    const { events, access } = await fetchCalendarBriefEvents(weekBounds);
    expect(access).toBe("granted");
    expect(events).toHaveLength(2);
    expect(mockCalendar.getEventsAsync).toHaveBeenCalledWith(
      ["cal-1", "cal-2"],
      weekBounds.start,
      weekBounds.end,
    );
    expect(events[0].id).toBe("a");
    expect(events[1].id).toBe("b");
    expect(events[0].allDay).toBe(true);
    expect(events[0].calendarName).toBe("Jobb");
  });

  it("only fetches events from selected calendar ids", async () => {
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-1", title: "Privat" } as never,
      { id: "cal-2", title: "Jobb" } as never,
    ]);
    mockCalendar.getEventsAsync.mockResolvedValue([]);

    const weekBounds = getCalendarWeekBounds();
    await fetchCalendarBriefEvents(weekBounds, ["cal-2"]);

    expect(mockCalendar.getEventsAsync).toHaveBeenCalledWith(
      ["cal-2"],
      weekBounds.start,
      weekBounds.end,
    );
  });

  it("returns error access and logs when fetch throws", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockRejectedValue(new Error("calendar unavailable"));

    await expect(fetchCalendarBriefEvents()).resolves.toEqual({
      events: [],
      access: "error",
    });

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("returns granted with empty events when no calendars exist", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([]);

    await expect(fetchCalendarBriefEvents()).resolves.toEqual({
      events: [],
      access: "granted",
    });

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("injects dev stubs when week has no events in __DEV__", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-job", title: "Jobb" } as never,
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowJob = new Date(today);
    tomorrowJob.setDate(tomorrowJob.getDate() + 1);
    tomorrowJob.setHours(9, 0, 0, 0);

    mockCalendar.getEventsAsync.mockResolvedValue([
      {
        id: "job-tomorrow",
        title: "Standup",
        startDate: tomorrowJob.toISOString(),
        endDate: tomorrowJob.toISOString(),
        allDay: false,
        calendarId: "cal-job",
      } as never,
    ]);

    const { events } = await fetchCalendarBriefEvents(getCalendarWeekBounds());
    expect(events.some((e) => e.id === "job-tomorrow")).toBe(true);
    expect(events.some((e) => e.id.startsWith("dev-stub-"))).toBe(false);
  });

  it("injects dev stubs when calendar returns no events in __DEV__", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-1", title: "Privat" } as never,
    ]);
    mockCalendar.getEventsAsync.mockResolvedValue([]);

    const { events } = await fetchCalendarBriefEvents(getCalendarWeekBounds());
    const tomorrowPrivat = events.filter(
      (e) => e.daysUntil === 1 && e.calendarName === "Privat",
    );
    expect(tomorrowPrivat.length).toBeGreaterThanOrEqual(3);
  });
});
