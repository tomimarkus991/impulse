import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));
jest.mock("../localSnapshot", () => ({
  buildLocalSnapshot: jest.fn(async () => ({
    app: "impulse",
    version: 1,
    exportedAt: "2026-10-10T09:00:00.000Z",
    events: [],
    presets: [],
  })),
}));
jest.mock("../../api/client", () => {
  const actual = jest.requireActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, apiFetch: jest.fn() };
});

import { apiFetch, ApiError, NetworkError } from "../../api/client";
import { getSession, saveSession } from "../../api/session";
import { Storage } from "../../test/kvStoreMock";
import { getSyncState, resetSyncStateCache, setSyncState } from "../syncState";
import {
  markDataChanged,
  markRestoredFromServer,
  UPLOAD_DEBOUNCE_MS,
  uploadSnapshot,
} from "../upload";

const api = apiFetch as jest.MockedFunction<typeof apiFetch>;
const signIn = () => saveSession({ token: "jwt", user: { id: 1, email: "a@b.c", name: null } });

describe("uploadSnapshot", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
  });

  it("does nothing when signed out and stays pending", async () => {
    setSyncState({ pending: true });
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
    expect(getSyncState().pending).toBe(true);
  });

  it("does nothing when nothing is pending", async () => {
    signIn();
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
  });

  it("does nothing while held", async () => {
    signIn();
    setSyncState({ pending: true, held: true });
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
    expect(getSyncState().pending).toBe(true);
  });

  it("PUTs the snapshot, clears pending and records the time", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockResolvedValue({ events: 0, presets: 0, receivedAt: "x" });

    await uploadSnapshot();

    expect(api).toHaveBeenCalledWith("/me/snapshot", {
      method: "PUT",
      body: expect.objectContaining({ app: "impulse", version: 1 }),
    });
    expect(getSyncState().pending).toBe(false);
    expect(getSyncState().lastUploadedAt).not.toBeNull();
    expect(getSyncState().lastSyncedUserId).toBe(1);
  });

  it("keeps pending on 401", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockRejectedValue(new ApiError(401, "Expired"));

    await uploadSnapshot();

    expect(getSyncState().pending).toBe(true);
    expect(getSyncState().lastSyncedUserId).toBeNull();
  });

  it("keeps pending on network errors", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockRejectedValue(new NetworkError("offline"));

    await uploadSnapshot();

    expect(getSession()).not.toBeNull();
    expect(getSyncState().pending).toBe(true);
  });
});

describe("markDataChanged", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
    api.mockResolvedValue({});
    jest.useFakeTimers();
  });

  it("marks pending even when signed out, without uploading", async () => {
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS);

    expect(getSyncState().pending).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });

  it("collapses changes within the debounce into one upload", async () => {
    signIn();
    markDataChanged();
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS);

    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe("markRestoredFromServer", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
    jest.useRealTimers();
  });

  it("clears pending and held so no upload follows", async () => {
    signIn();
    setSyncState({ pending: true, held: true });

    markRestoredFromServer();
    await uploadSnapshot();

    expect(getSyncState()).toMatchObject({ pending: false, held: false });
    expect(getSyncState().lastUploadedAt).not.toBeNull();
    expect(getSyncState().lastSyncedUserId).toBe(1);
    expect(api).not.toHaveBeenCalled();
  });
});
