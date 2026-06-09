import * as Calendar from "expo-calendar";
import { PermissionStatus } from "expo-modules-core";
import { fetchCalendarBriefEvents } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";

jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: { EVENT: "event" },
}));

const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe("fetchCalendarBriefEvents", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns [] when permission is denied", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("returns sorted events from remindifier calendar", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-1", title: "Privat" } as never,
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
        calendarId: "cal-1",
      } as never,
    ]);

    const weekBounds = getCalendarWeekBounds();
    const events = await fetchCalendarBriefEvents(weekBounds);
    expect(events).toHaveLength(2);
    expect(mockCalendar.getEventsAsync).toHaveBeenCalledWith(
      ["cal-1"],
      weekBounds.start,
      weekBounds.end,
    );
    expect(events[0].id).toBe("a");
    expect(events[1].id).toBe("b");
    expect(events[0].allDay).toBe(true);
    expect(events[0].calendarName).toBe("Privat");
  });

  it("returns [] and logs when fetch throws", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockRejectedValue(new Error("calendar unavailable"));

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("returns [] when calendar is missing", async () => {
    const dev = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = false;

    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([]);

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);

    (global as { __DEV__?: boolean }).__DEV__ = dev;
  });

  it("injects dev tomorrow stubs when Privat tomorrow is missing", async () => {
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

    const events = await fetchCalendarBriefEvents(getCalendarWeekBounds());
    const tomorrowPrivat = events.filter(
      (e) => e.daysUntil === 1 && e.calendarName === "Privat",
    );
    expect(tomorrowPrivat.length).toBeGreaterThanOrEqual(3);
  });
});
