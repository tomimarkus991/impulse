import { format } from "date-fns";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { db } from "../../app/_layout";
import { eventsTable, presetsTable } from "../db/schema";
import { Backup, createBackup, parseBackup } from "./backup";

// Keeps each insert well under SQLite's bound-parameter limit
const INSERT_CHUNK = 500;

const chunks = <T>(items: T[]) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += INSERT_CHUNK)
    result.push(items.slice(i, i + INSERT_CHUNK));
  return result;
};

/** Writes all events and presets to a JSON file and opens the share sheet for it. */
export const exportBackup = async () => {
  const now = new Date();
  const [events, presets] = await Promise.all([
    db.select().from(eventsTable),
    db.select().from(presetsTable),
  ]);

  const file = new File(Paths.cache, `impulse-backup-${format(now, "yyyy-MM-dd")}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(createBackup(events, presets, now)));

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Export Impulse backup",
  });

  return { events: events.length, presets: presets.length };
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
