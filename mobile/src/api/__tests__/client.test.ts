import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { apiFetch, ApiError, NetworkError } from "../client";
import { getSyncState, resetSyncStateCache } from "../../sync/syncState";
import { getSession, saveSession } from "../session";

const fetchMock = jest.fn<typeof fetch>();

describe("apiFetch", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    global.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("sends JSON with the bearer token and parses the response", async () => {
    saveSession({ token: "jwt", user: { id: 1, email: "a@b.c", name: null } });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await apiFetch<{ ok: boolean }>("/me/snapshot", {
      method: "PUT",
      body: { a: 1 },
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/me/snapshot");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("omits Authorization when signed out", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await apiFetch("/auth/google", { method: "POST", body: {} });

    expect(
      (fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization
    ).toBeUndefined();
  });

  it("throws ApiError with status and server message on non-2xx", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"Bad snapshot"}', { status: 400 }));

    await expect(apiFetch("/me/snapshot")).rejects.toEqual(new ApiError(400, "Bad snapshot"));
  });

  it("signs out and flags it when an authenticated request gets 401", async () => {
    saveSession({ token: "jwt", user: { id: 1, email: "a@b.c", name: null } });
    fetchMock.mockResolvedValue(new Response('{"error":"Expired"}', { status: 401 }));

    await expect(apiFetch("/me/snapshot")).rejects.toEqual(new ApiError(401, "Expired"));
    expect(getSession()).toBeNull();
    expect(getSyncState().signedOutByServer).toBe(true);
  });

  it("leaves state alone on 401 without a token", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"Bad token"}', { status: 401 }));

    await expect(apiFetch("/auth/google", { method: "POST", body: {} })).rejects.toEqual(
      new ApiError(401, "Bad token")
    );
    expect(getSyncState().signedOutByServer).toBe(false);
  });

  it("ignores a late 401 for a token that has since been replaced", async () => {
    saveSession({ token: "old", user: { id: 1, email: "a@b.c", name: null } });
    fetchMock.mockImplementation(async () => {
      saveSession({ token: "new", user: { id: 1, email: "a@b.c", name: null } });
      return new Response('{"error":"Expired"}', { status: 401 });
    });

    await expect(apiFetch("/me/snapshot")).rejects.toBeInstanceOf(ApiError);
    expect(getSession()?.token).toBe("new");
  });

  it("keeps the status when the error body isn't JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const error = (await apiFetch("/me/snapshot").catch(e => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.name).toBe("ApiError");
  });

  it("throws NetworkError when fetch itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiFetch("/me/snapshot")).rejects.toBeInstanceOf(NetworkError);
  });
});
