import * as Calendar from "expo-calendar";
import { PermissionStatus } from "expo-modules-core";
import { fetchCalendarBriefEvents } from "@/lib/brief/calendarEvents";

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
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);
  });

  it("returns sorted events from remindifier calendar", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: "cal-1", title: "remindifier (test)" } as never,
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const later = new Date(today);
    later.setDate(later.getDate() + 2);
    later.setHours(16, 0, 0, 0);
    const sooner = new Date(today);
    sooner.setDate(sooner.getDate() + 1);

    mockCalendar.getEventsAsync.mockResolvedValue([
      {
        id: "b",
        title: "Later",
        startDate: later.toISOString(),
        endDate: later.toISOString(),
        allDay: false,
      } as never,
      {
        id: "a",
        title: "Sooner",
        startDate: sooner.toISOString(),
        endDate: sooner.toISOString(),
        allDay: true,
      } as never,
    ]);

    const events = await fetchCalendarBriefEvents();
    expect(events).toHaveLength(2);
    expect(events[0].id).toBe("a");
    expect(events[1].id).toBe("b");
    expect(events[0].allDay).toBe(true);
  });

  it("returns [] and logs when fetch throws", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockRejectedValue(new Error("calendar unavailable"));

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);
  });

  it("returns [] when calendar is missing", async () => {
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.getCalendarsAsync.mockResolvedValue([]);

    await expect(fetchCalendarBriefEvents()).resolves.toEqual([]);
  });
});
