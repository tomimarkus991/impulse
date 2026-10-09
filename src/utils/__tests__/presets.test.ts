import { describe, expect, it } from "@jest/globals";
import type { SelectPreset } from "../../db/types";
import {
  canPin,
  filterPresets,
  MAX_PINNED,
  movePinned,
  nextPinnedPosition,
  nextPresetId,
  otherPresets,
  pinnedPresets,
} from "../presets";

const preset = (id: number, title: string, pinned = false, position = 0): SelectPreset => ({
  id,
  title,
  color: "#000000",
  locked: false,
  pinned,
  position,
});

const presets = [
  preset(1, "Push", true, 2),
  preset(2, "Pull", true, 1),
  preset(3, "yoga"),
  preset(4, "Legs", true, 3),
  preset(5, "Cardio"),
];

describe("pinnedPresets / otherPresets", () => {
  it("orders pinned presets by position", () => {
    expect(pinnedPresets(presets).map(p => p.title)).toEqual(["Pull", "Push", "Legs"]);
  });

  it("orders the rest by title, ignoring case", () => {
    expect(otherPresets(presets).map(p => p.title)).toEqual(["Cardio", "yoga"]);
  });
});

describe("canPin", () => {
  it(`allows up to ${MAX_PINNED} pinned presets`, () => {
    expect(canPin(presets)).toBe(true);
    expect(canPin([...presets, preset(6, "Run", true, 4), preset(7, "Swim", true, 5)])).toBe(false);
  });
});

describe("nextPresetId / nextPinnedPosition", () => {
  it("continues after the highest existing values", () => {
    expect(nextPresetId(presets)).toBe(6);
    expect(nextPinnedPosition(presets)).toBe(4);
  });

  it("starts at 1 when empty", () => {
    expect(nextPresetId([])).toBe(1);
    expect(nextPinnedPosition([])).toBe(1);
  });
});

describe("movePinned", () => {
  it("swaps positions with the neighbour in the given direction", () => {
    expect(movePinned(presets, 1, -1)).toEqual([
      { id: 1, position: 1 },
      { id: 2, position: 2 },
    ]);
    expect(movePinned(presets, 1, 1)).toEqual([
      { id: 1, position: 3 },
      { id: 4, position: 2 },
    ]);
  });

  it("does nothing at the edges or for unpinned presets", () => {
    expect(movePinned(presets, 2, -1)).toEqual([]);
    expect(movePinned(presets, 4, 1)).toEqual([]);
    expect(movePinned(presets, 3, 1)).toEqual([]);
  });
});

describe("filterPresets", () => {
  it("matches titles case-insensitively and reports an exact match", () => {
    expect(filterPresets(presets, "pu").matches.map(p => p.title)).toEqual(["Pull", "Push"]);
    expect(filterPresets(presets, " push ").exactMatch).toBe(true);
    expect(filterPresets(presets, "pus").exactMatch).toBe(false);
  });

  it("returns everything for an empty query", () => {
    expect(filterPresets(presets, "  ").matches).toHaveLength(presets.length);
  });
});
