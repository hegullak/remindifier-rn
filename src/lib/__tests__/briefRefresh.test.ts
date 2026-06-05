import { notifyBriefReload, subscribeBriefReload } from "@/lib/brief/briefRefresh";

describe("briefRefresh", () => {
  it("notifies subscribed listeners and supports unsubscribe", () => {
    const first = jest.fn();
    const second = jest.fn();
    const unsubFirst = subscribeBriefReload(first);

    notifyBriefReload();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    subscribeBriefReload(second);
    notifyBriefReload();
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);

    unsubFirst();
    notifyBriefReload();
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });
});
