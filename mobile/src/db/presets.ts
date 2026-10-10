import { eq } from "drizzle-orm";
import { db } from "../../app/_layout";
import { canPin, movePinned, nextPinnedPosition, nextPresetId } from "../utils/presets";
import { markDataChanged } from "../sync/upload";
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

  markDataChanged();
  return preset;
};

export const updatePreset = async (id: number, changes: { title?: string; color?: string }) => {
  await db.update(presetsTable).set(changes).where(eq(presetsTable.id, id));
  markDataChanged();
};

export const deletePreset = async (id: number) => {
  await db.delete(presetsTable).where(eq(presetsTable.id, id));
  markDataChanged();
};

/** Pins or unpins a preset. Returns false when pinning is refused because the grid is full. */
export const setPresetPinned = async (presets: SelectPreset[], id: number, pinned: boolean) => {
  if (pinned && !canPin(presets)) return false;

  await db
    .update(presetsTable)
    .set({ pinned, position: pinned ? nextPinnedPosition(presets) : 0 })
    .where(eq(presetsTable.id, id));

  markDataChanged();
  return true;
};

export const movePinnedPreset = async (presets: SelectPreset[], id: number, direction: -1 | 1) => {
  for (const { id: presetId, position } of movePinned(presets, id, direction)) {
    await db.update(presetsTable).set({ position }).where(eq(presetsTable.id, presetId));
  }

  markDataChanged();
};
