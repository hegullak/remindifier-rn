import * as Calendar from "expo-calendar";
import { PermissionStatus } from "expo-modules-core";
import {
  deleteCalendarSyncEvent,
  deleteCalendarSyncEventsForCalendar,
  deleteCalendarSyncLink,
  listCalendarSyncEvents,
  upsertCalendarSyncEvent,
  upsertCalendarSyncLink,
} from "@/db/repos/calendarSyncRepo";
import { syncLinkedCalendar, unlinkCalendar } from "@/lib/brief/calendarSync";
import { getOrCreateEchoCalendarId } from "@/lib/brief/echoCalendar";

jest.mock("@/lib/brief/calendarAccess", () => ({
  calendarRequiresDevBuild: jest.fn(() => false),
}));

jest.mock("@/lib/brief/echoCalendar", () => ({
  getOrCreateEchoCalendarId: jest.fn(),
}));

jest.mock("@/db/repos/calendarSyncRepo", () => ({
  listCalendarSyncEvents: jest.fn(),
  upsertCalendarSyncEvent: jest.fn(),
  deleteCalendarSyncEvent: jest.fn(),
  upsertCalendarSyncLink: jest.fn(),
  deleteCalendarSyncLink: jest.fn(),
  deleteCalendarSyncEventsForCalendar: jest.fn(),
}));

jest.mock("expo-calendar", () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarPermissionsAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  createEventAsync: jest.fn(),
  updateEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
}));

const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;
const mockGetOrCreateEchoCalendarId = getOrCreateEchoCalendarId as jest.Mock;
const mockListCalendarSyncEvents = listCalendarSyncEvents as jest.Mock;
const mockUpsertCalendarSyncEvent = upsertCalendarSyncEvent as jest.Mock;
const mockDeleteCalendarSyncEvent = deleteCalendarSyncEvent as jest.Mock;
const mockUpsertCalendarSyncLink = upsertCalendarSyncLink as jest.Mock;
const mockDeleteCalendarSyncLink = deleteCalendarSyncLink as jest.Mock;
const mockDeleteCalendarSyncEventsForCalendar = deleteCalendarSyncEventsForCalendar as jest.Mock;

const GRANTED = {
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: "never" as const,
};

function rawEvent(overrides: Partial<Calendar.Event> = {}): Calendar.Event {
  return {
    id: "src-1",
    calendarId: "cal-1",
    title: "Standup",
    location: null,
    notes: "",
    alarms: [],
    recurrenceRule: null,
    startDate: new Date(2026, 6, 10, 9, 0, 0, 0).toISOString(),
    endDate: new Date(2026, 6, 10, 9, 30, 0, 0).toISOString(),
    allDay: false,
    availability: "busy" as never,
    status: "confirmed" as never,
    timeZone: "Europe/Oslo",
    ...overrides,
  } as Calendar.Event;
}

describe("syncLinkedCalendar", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue(GRANTED);
    mockCalendar.deleteEventAsync.mockResolvedValue(undefined);
    mockGetOrCreateEchoCalendarId.mockResolvedValue("echo-cal-id");
    mockListCalendarSyncEvents.mockResolvedValue([]);
  });

  it("returns expo_go when calendar requires a dev build", async () => {
    const access = jest.requireMock("@/lib/brief/calendarAccess");
    access.calendarRequiresDevBuild.mockReturnValueOnce(true);
    await expect(syncLinkedCalendar("u1", "cal-1", "Jobb")).resolves.toEqual({
      ok: false,
      reason: "expo_go",
    });
  });

  it("returns denied when permission is refused", async () => {
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });
    await expect(syncLinkedCalendar("u1", "cal-1", "Jobb")).resolves.toEqual({
      ok: false,
      reason: "denied",
    });
  });

  it("creates echo events for new source events and records the sync link", async () => {
    mockCalendar.getEventsAsync.mockResolvedValue([rawEvent({ id: "a" }), rawEvent({ id: "b" })]);
    mockCalendar.createEventAsync.mockResolvedValueOnce("echo-a").mockResolvedValueOnce("echo-b");

    const result = await syncLinkedCalendar("u1", "cal-1", "Jobb");

    expect(result).toEqual({ ok: true, created: 2, updated: 0, deleted: 0 });
    expect(mockCalendar.createEventAsync).toHaveBeenCalledTimes(2);
    expect(mockCalendar.createEventAsync).toHaveBeenCalledWith(
      "echo-cal-id",
      expect.objectContaining({ title: "Standup" }),
    );
    expect(mockUpsertCalendarSyncEvent).toHaveBeenCalledTimes(2);
    expect(mockUpsertCalendarSyncLink).toHaveBeenCalledWith(
      "u1",
      "cal-1",
      "Jobb",
      expect.any(Date),
    );
  });

  it("updates echo events whose source changed and leaves unchanged ones alone", async () => {
    const changed = rawEvent({ id: "a", title: "Standup (moved)" });
    mockCalendar.getEventsAsync.mockResolvedValue([changed]);
    mockListCalendarSyncEvents.mockResolvedValue([
      { sourceEventId: "a", echoEventId: "echo-a", signature: "stale-signature" },
    ]);

    const result = await syncLinkedCalendar("u1", "cal-1", "Jobb");

    expect(result).toEqual({ ok: true, created: 0, updated: 1, deleted: 0 });
    expect(mockCalendar.updateEventAsync).toHaveBeenCalledWith(
      "echo-a",
      expect.objectContaining({ title: "Standup (moved)" }),
    );
    expect(mockCalendar.createEventAsync).not.toHaveBeenCalled();
  });

  it("deletes echo events whose source event was removed", async () => {
    mockCalendar.getEventsAsync.mockResolvedValue([]);
    mockListCalendarSyncEvents.mockResolvedValue([
      { sourceEventId: "gone", echoEventId: "echo-gone", signature: "x" },
    ]);

    const result = await syncLinkedCalendar("u1", "cal-1", "Jobb");

    expect(result).toEqual({ ok: true, created: 0, updated: 0, deleted: 1 });
    expect(mockCalendar.deleteEventAsync).toHaveBeenCalledWith("echo-gone");
    expect(mockDeleteCalendarSyncEvent).toHaveBeenCalledWith("u1", "gone");
  });

  it("returns an error result when the device calendar API throws", async () => {
    mockCalendar.getEventsAsync.mockRejectedValue(new Error("boom"));
    const result = await syncLinkedCalendar("u1", "cal-1", "Jobb");
    expect(result.ok).toBe(false);
    expect((result as { reason: string }).reason).toBe("error");
  });
});

describe("unlinkCalendar", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCalendar.deleteEventAsync.mockResolvedValue(undefined);
  });

  it("deletes every copied echo event, then the link", async () => {
    mockDeleteCalendarSyncEventsForCalendar.mockResolvedValue([
      { sourceEventId: "a", echoEventId: "echo-a", signature: "x" },
      { sourceEventId: "b", echoEventId: "echo-b", signature: "y" },
    ]);

    await unlinkCalendar("u1", "cal-1");

    expect(mockCalendar.deleteEventAsync).toHaveBeenCalledWith("echo-a");
    expect(mockCalendar.deleteEventAsync).toHaveBeenCalledWith("echo-b");
    expect(mockDeleteCalendarSyncLink).toHaveBeenCalledWith("u1", "cal-1");
  });
});
