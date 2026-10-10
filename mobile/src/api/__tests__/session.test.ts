import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { clearSession, getSession, saveSession } from "../session";

const user = { id: 7, email: "me@example.com", name: "Me" };

describe("session", () => {
  beforeEach(() => {
    Storage.clearSync();
  });

  it("is null when nothing is stored", () => {
    expect(getSession()).toBeNull();
  });

  it("round-trips token and user", () => {
    saveSession({ token: "jwt", user });

    expect(getSession()).toEqual({ token: "jwt", user });
  });

  it("clearSession removes token and user", () => {
    saveSession({ token: "jwt", user });
    clearSession();

    expect(getSession()).toBeNull();
  });
});
