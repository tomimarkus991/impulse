import { eq } from "drizzle-orm";
import { db } from "../../app/_layout";
import { canPin, movePinned, nextPinnedPosition, nextPresetId } from "../utils/presets";
import { presetsTable } from "./schema";
import { SelectPreset } from "./types";

export const loadPresets = () => db.select().from(presetsTable);

/** Creates a preset, pinned when there's room, and returns it. */
export const createPreset = async (
  presets: SelectPreset[],
  { title, color }: { title: string; color: string }
) => {
  const pinned = canPin(presets);

  const [preset] = await db
    .insert(presetsTable)
    .values({
      id: nextPresetId(presets),
      title,
      color,
      pinned,
      position: pinned ? nextPinnedPosition(presets) : 0,
    })
    .returning();

  return preset;
};

export const updatePreset = (id: number, changes: { title?: string; color?: string }) =>
  db.update(presetsTable).set(changes).where(eq(presetsTable.id, id));

export const deletePreset = (id: number) => db.delete(presetsTable).where(eq(presetsTable.id, id));

/** Pins or unpins a preset. Returns false when pinning is refused because the grid is full. */
export const setPresetPinned = async (presets: SelectPreset[], id: number, pinned: boolean) => {
  if (pinned && !canPin(presets)) return false;

  await db
    .update(presetsTable)
    .set({ pinned, position: pinned ? nextPinnedPosition(presets) : 0 })
    .where(eq(presetsTable.id, id));

  return true;
};

export const movePinnedPreset = async (presets: SelectPreset[], id: number, direction: -1 | 1) => {
  for (const { id: presetId, position } of movePinned(presets, id, direction)) {
    await db.update(presetsTable).set({ position }).where(eq(presetsTable.id, presetId));
  }
};
