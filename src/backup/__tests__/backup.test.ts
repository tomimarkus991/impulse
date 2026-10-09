import { describe, expect, it } from "@jest/globals";
import type { SelectEvent, SelectPreset } from "../../db/types";
import { BackupError, createBackup, parseBackup } from "../backup";

const event: SelectEvent = {
  id: 7,
  color: "#312e81",
  locked: true,
  start: "2026-10-09T08:00:00.000Z",
  end: "2026-10-09T10:00:00.000Z",
  title: "Push",
};

const preset: SelectPreset = {
  id: 1,
  title: "Push",
  color: "#312e81",
  locked: false,
  pinned: true,
  position: 1,
};

const now = new Date("2026-10-09T12:00:00.000Z");

describe("createBackup / parseBackup", () => {
  it("round-trips events and presets", () => {
    const backup = createBackup([event], [preset], now);

    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it("fills defaults for optional fields", () => {
    const text = JSON.stringify({
      app: "impulse",
      version: 1,
      events: [{ ...event, locked: null }],
      presets: [{ id: 2, title: "Pull", color: "#be6404" }],
    });

    const backup = parseBackup(text);

    expect(backup.events[0].locked).toBe(false);
    expect(backup.presets[0]).toEqual({
      id: 2,
      title: "Pull",
      color: "#be6404",
      locked: false,
      pinned: false,
      position: 0,
    });
  });

  it.each([
    ["not JSON", "{oops"],
    ["another app", JSON.stringify({ app: "other", version: 1, events: [], presets: [] })],
    ["a newer version", JSON.stringify({ app: "impulse", version: 2, events: [], presets: [] })],
    ["missing events", JSON.stringify({ app: "impulse", version: 1, presets: [] })],
    [
      "an event with a bad date",
      JSON.stringify({
        app: "impulse",
        version: 1,
        events: [{ ...event, start: "nope" }],
        presets: [],
      }),
    ],
    [
      "a preset without a title",
      JSON.stringify({
        app: "impulse",
        version: 1,
        events: [],
        presets: [{ id: 1, color: "#000" }],
      }),
    ],
  ])("rejects %s", (_, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
  });
});
