import { format } from "date-fns";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File } from "expo-file-system";
import { db } from "../../app/_layout";
import { eventsTable, presetsTable } from "../db/schema";
import { buildLocalSnapshot } from "../sync/localSnapshot";
import { Backup, parseBackup } from "./backup";

// Keeps each insert well under SQLite's bound-parameter limit
const INSERT_CHUNK = 500;

const chunks = <T>(items: T[]) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += INSERT_CHUNK)
    result.push(items.slice(i, i + INSERT_CHUNK));
  return result;
};

const buildBackupFile = async () => {
  const now = new Date();
  const backup = await buildLocalSnapshot(now);

  return {
    name: `impulse-backup-${format(now, "yyyy-MM-dd-HHmm")}.json`,
    contents: JSON.stringify(backup),
    events: backup.events.length,
    presets: backup.presets.length,
  };
};

const isPickerCancelled = (error: unknown) =>
  error instanceof Error && /cancel/i.test(error.message);

/**
 * Lets the user pick a folder (e.g. Downloads) and saves the backup there.
 * Resolves null when they cancel the folder picker.
 */
export const saveBackupToFolder = async () => {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    throw error;
  }

  const backup = await buildBackupFile();
  folder.createFile(backup.name, "application/json").write(backup.contents);

  return backup;
};

/** Lets the user pick a backup file. Resolves null when they cancel; throws BackupError on bad files. */
export const pickBackup = async (): Promise<Backup | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  return parseBackup(await new File(result.assets[0].uri).text());
};

/** Replaces every event and preset with the backup's contents in one transaction. */
export const restoreBackup = (backup: Backup) => {
  db.transaction(tx => {
    tx.delete(eventsTable).run();
    tx.delete(presetsTable).run();

    for (const chunk of chunks(backup.presets)) tx.insert(presetsTable).values(chunk).run();
    for (const chunk of chunks(backup.events)) tx.insert(eventsTable).values(chunk).run();
  });
};
