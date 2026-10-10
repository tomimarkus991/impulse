import { db } from "../../app/_layout";
import { Backup, createBackup } from "../backup/backup";
import { eventsTable, presetsTable } from "../db/schema";

/** All local events and presets in the backup/snapshot format. */
export const buildLocalSnapshot = async (now = new Date()): Promise<Backup> => {
  const [events, presets] = await Promise.all([
    db.select().from(eventsTable),
    db.select().from(presetsTable),
  ]);

  return createBackup(events, presets, now);
};
