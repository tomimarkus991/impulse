import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { apiFetch, ApiError, NetworkError } from "../client";
import { saveSession } from "../session";

const fetchMock = jest.fn<typeof fetch>();

describe("apiFetch", () => {
  beforeEach(() => {
    Storage.clearSync();
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

  it("throws NetworkError when fetch itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiFetch("/me/snapshot")).rejects.toBeInstanceOf(NetworkError);
  });
});
