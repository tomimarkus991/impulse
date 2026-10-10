import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { getSyncState, resetSyncStateCache, setSyncState, subscribeSyncState } from "../syncState";

describe("syncState", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
  });

  it("defaults to nothing pending, not held, never uploaded", () => {
    expect(getSyncState()).toEqual({
      pending: false,
      held: false,
      lastUploadedAt: null,
      serverSnapshot: null,
      lastSyncedUserId: null,
      signedOutByServer: false,
    });
  });

  it("persists partial updates", () => {
    setSyncState({ pending: true });
    setSyncState({ lastUploadedAt: "2026-10-10T09:00:00.000Z" });

    expect(getSyncState()).toEqual({
      pending: true,
      held: false,
      lastUploadedAt: "2026-10-10T09:00:00.000Z",
      serverSnapshot: null,
      lastSyncedUserId: null,
      signedOutByServer: false,
    });
  });

  it("notifies subscribers and returns a stable snapshot between changes", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSyncState(listener);

    const before = getSyncState();
    expect(getSyncState()).toBe(before);

    setSyncState({ held: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSyncState()).not.toBe(before);

    unsubscribe();
    setSyncState({ held: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
