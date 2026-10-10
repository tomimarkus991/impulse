import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));
jest.mock("@react-native-google-signin/google-signin", () => ({}));
jest.mock("../../sync/upload", () => ({ uploadSnapshot: jest.fn(async () => {}) }));

import { uploadSnapshot } from "../../sync/upload";
import { getSyncState, resetSyncStateCache, setSyncState } from "../../sync/syncState";
import { Storage } from "../../test/kvStoreMock";
import { AuthResponse, completeSignIn } from "../auth";
import { clearSession, getSession } from "../session";

const upload = uploadSnapshot as jest.MockedFunction<typeof uploadSnapshot>;
const user = { id: 3, email: "me@example.com", name: "Me" };
const response = (snapshot: AuthResponse["snapshot"]): AuthResponse => ({
  token: "jwt",
  user,
  snapshot,
});

describe("completeSignIn", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    upload.mockClear();
  });

  it("saves the session", async () => {
    await completeSignIn(response(null));
    expect(getSession()).toEqual({ token: "jwt", user });
  });

  it("uploads straight away when the server is empty", async () => {
    await completeSignIn(response(null));

    expect(getSyncState()).toMatchObject({ pending: true, held: false });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("holds uploads when the server already has data", async () => {
    await completeSignIn(
      response({ receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 })
    );

    expect(getSyncState()).toMatchObject({
      held: true,
      serverSnapshot: { receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 },
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it("does not hold when the same user signs back in after syncing before", async () => {
    setSyncState({ lastSyncedUserId: 3, lastUploadedAt: "2026-10-09T10:00:00Z", pending: true });

    await completeSignIn(
      response({ receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 })
    );

    expect(getSyncState().held).toBe(false);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("holds when a different user signs in after another account synced", async () => {
    setSyncState({ lastSyncedUserId: 99, lastUploadedAt: "2026-10-09T10:00:00Z" });

    await completeSignIn(response({ receivedAt: "2026-10-09T10:00:00Z", events: 5, presets: 1 }));

    expect(getSyncState().held).toBe(true);
  });

  it("stays held when a held user signs out and back in", async () => {
    // Another account synced from this phone earlier
    setSyncState({ lastSyncedUserId: 99, lastUploadedAt: "2026-10-09T10:00:00Z" });
    const snapshot = { receivedAt: "2026-10-09T10:00:00Z", events: 5, presets: 1 };

    await completeSignIn(response(snapshot));
    clearSession();
    await completeSignIn(response(snapshot));

    expect(getSyncState().held).toBe(true);
    expect(upload).not.toHaveBeenCalled();
  });

  it("clears the signed-out-by-server flag", async () => {
    setSyncState({ signedOutByServer: true });
    await completeSignIn(response(null));

    expect(getSyncState().signedOutByServer).toBe(false);
  });
});
