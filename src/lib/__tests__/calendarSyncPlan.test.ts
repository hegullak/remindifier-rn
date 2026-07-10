import {
  buildEventSignature,
  planCalendarSync,
  type SourceCalendarEvent,
  type SyncEventRecord,
} from "@/lib/brief/calendarSyncPlan";

function makeEvent(overrides: Partial<SourceCalendarEvent> = {}): SourceCalendarEvent {
  return {
    id: "src-1",
    title: "Standup",
    notes: null,
    location: null,
    startDate: new Date(2026, 6, 10, 9, 0, 0, 0),
    endDate: new Date(2026, 6, 10, 9, 30, 0, 0),
    allDay: false,
    ...overrides,
  };
}

describe("buildEventSignature", () => {
  it("is stable for identical events", () => {
    const a = makeEvent();
    const b = makeEvent();
    expect(buildEventSignature(a)).toBe(buildEventSignature(b));
  });

  it("changes when the title changes", () => {
    const a = makeEvent();
    const b = makeEvent({ title: "Standup (moved)" });
    expect(buildEventSignature(a)).not.toBe(buildEventSignature(b));
  });

  it("changes when the start time changes", () => {
    const a = makeEvent();
    const b = makeEvent({ startDate: new Date(2026, 6, 10, 10, 0, 0, 0) });
    expect(buildEventSignature(a)).not.toBe(buildEventSignature(b));
  });

  it("treats null and empty-string notes as equivalent", () => {
    const a = makeEvent({ notes: null });
    const b = makeEvent({ notes: "" });
    expect(buildEventSignature(a)).toBe(buildEventSignature(b));
  });
});

describe("planCalendarSync", () => {
  it("creates every event when nothing has been synced yet", () => {
    const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" })];
    const plan = planCalendarSync(events, []);
    expect(plan.toCreate.map((e) => e.id)).toEqual(["a", "b"]);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(0);
  });

  it("leaves unchanged events alone", () => {
    const event = makeEvent({ id: "a" });
    const existing: SyncEventRecord[] = [
      { sourceEventId: "a", echoEventId: "echo-a", signature: buildEventSignature(event) },
    ];
    const plan = planCalendarSync([event], existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toDelete).toHaveLength(0);
  });

  it("updates an event whose signature changed", () => {
    const original = makeEvent({ id: "a", title: "Standup" });
    const changed = makeEvent({ id: "a", title: "Standup (moved to 10)" });
    const existing: SyncEventRecord[] = [
      { sourceEventId: "a", echoEventId: "echo-a", signature: buildEventSignature(original) },
    ];
    const plan = planCalendarSync([changed], existing);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toEqual([{ source: changed, echoEventId: "echo-a" }]);
    expect(plan.toDelete).toHaveLength(0);
  });

  it("deletes echo copies whose source event disappeared", () => {
    const existing: SyncEventRecord[] = [
      { sourceEventId: "a", echoEventId: "echo-a", signature: "whatever" },
    ];
    const plan = planCalendarSync([], existing);
    expect(plan.toDelete).toEqual([{ sourceEventId: "a", echoEventId: "echo-a" }]);
  });

  it("handles create, update, and delete together in one pass", () => {
    const kept = makeEvent({ id: "kept", title: "Kept" });
    const changed = makeEvent({ id: "changed", title: "Changed now" });
    const changedOriginal = makeEvent({ id: "changed", title: "Changed" });
    const brandNew = makeEvent({ id: "new" });

    const existing: SyncEventRecord[] = [
      { sourceEventId: "kept", echoEventId: "echo-kept", signature: buildEventSignature(kept) },
      {
        sourceEventId: "changed",
        echoEventId: "echo-changed",
        signature: buildEventSignature(changedOriginal),
      },
      { sourceEventId: "gone", echoEventId: "echo-gone", signature: "x" },
    ];

    const plan = planCalendarSync([kept, changed, brandNew], existing);

    expect(plan.toCreate.map((e) => e.id)).toEqual(["new"]);
    expect(plan.toUpdate).toEqual([{ source: changed, echoEventId: "echo-changed" }]);
    expect(plan.toDelete).toEqual([{ sourceEventId: "gone", echoEventId: "echo-gone" }]);
  });
});
