import type { SelectEvent, SelectPreset } from "../db/types";

export const BACKUP_APP = "impulse";
export const BACKUP_VERSION = 1;

export type Backup = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  events: SelectEvent[];
  presets: SelectPreset[];
};

export class BackupError extends Error {}

export const createBackup = (
  events: SelectEvent[],
  presets: SelectPreset[],
  now: Date
): Backup => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  exportedAt: now.toISOString(),
  events,
  presets,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (message: string): never => {
  throw new BackupError(message);
};

const parseEvent = (value: unknown, index: number): SelectEvent => {
  if (!isRecord(value)) return fail(`Event ${index + 1} is not an object`);

  const { id, color, locked, start, end, title } = value;

  if (typeof id !== "number") return fail(`Event ${index + 1} has no id`);
  if (typeof color !== "string") return fail(`Event ${index + 1} has no colour`);
  if (typeof title !== "string") return fail(`Event ${index + 1} has no title`);
  if (typeof start !== "string" || isNaN(Date.parse(start))) {
    return fail(`Event ${index + 1} has an invalid start`);
  }
  if (typeof end !== "string" || isNaN(Date.parse(end))) {
    return fail(`Event ${index + 1} has an invalid end`);
  }

  return { id, color, locked: locked === true, start, end, title };
};

const parsePreset = (value: unknown, index: number): SelectPreset => {
  if (!isRecord(value)) return fail(`Preset ${index + 1} is not an object`);

  const { id, title, color, locked, pinned, position } = value;

  if (typeof id !== "number") return fail(`Preset ${index + 1} has no id`);
  if (typeof title !== "string") return fail(`Preset ${index + 1} has no title`);
  if (typeof color !== "string") return fail(`Preset ${index + 1} has no colour`);

  return {
    id,
    title,
    color,
    locked: locked === true,
    pinned: pinned === true,
    position: typeof position === "number" ? position : 0,
  };
};

/** Parses and validates a backup file's text. Throws BackupError when it isn't a usable backup. */
export const parseBackup = (text: string): Backup => {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return fail("The file isn't valid JSON");
  }

  if (!isRecord(data) || data.app !== BACKUP_APP) return fail("The file isn't an Impulse backup");
  if (data.version !== BACKUP_VERSION) return fail(`Unsupported backup version ${data.version}`);
  if (!Array.isArray(data.events) || !Array.isArray(data.presets)) {
    return fail("The backup is missing events or presets");
  }

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
    events: data.events.map(parseEvent),
    presets: data.presets.map(parsePreset),
  };
};
