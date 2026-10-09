import type { SelectPreset } from "../db/types";

// Pinned presets fill the add sheet's tile grid; the last tile is always "More"
export const MAX_PINNED = 5;

const byTitle = (a: SelectPreset, b: SelectPreset) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

export const pinnedPresets = (presets: SelectPreset[]) =>
  presets.filter(p => p.pinned).sort((a, b) => a.position - b.position);

export const otherPresets = (presets: SelectPreset[]) =>
  presets.filter(p => !p.pinned).sort(byTitle);

export const canPin = (presets: SelectPreset[]) => pinnedPresets(presets).length < MAX_PINNED;

// Preset ids aren't auto-incremented, so new ones continue after the highest id
export const nextPresetId = (presets: SelectPreset[]) => Math.max(0, ...presets.map(p => p.id)) + 1;

export const nextPinnedPosition = (presets: SelectPreset[]) =>
  Math.max(0, ...pinnedPresets(presets).map(p => p.position)) + 1;

/** Position updates that swap a pinned preset with its neighbour, or none at the edges. */
export const movePinned = (presets: SelectPreset[], id: number, direction: -1 | 1) => {
  const pinned = pinnedPresets(presets);
  const index = pinned.findIndex(p => p.id === id);
  const neighbour = pinned[index + direction];

  if (index === -1 || !neighbour) return [];

  return [
    { id, position: neighbour.position },
    { id: neighbour.id, position: pinned[index].position },
  ];
};

export const filterPresets = (presets: SelectPreset[], query: string) => {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? presets.filter(p => p.title.toLowerCase().includes(needle)).sort(byTitle)
    : presets;

  return {
    matches,
    exactMatch: presets.some(p => p.title.toLowerCase() === needle),
  };
};
