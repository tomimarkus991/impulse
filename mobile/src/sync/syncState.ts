import { Storage } from "expo-sqlite/kv-store";

export type ServerSnapshotInfo = { receivedAt: string; events: number; presets: number };

export type SyncState = {
  /** Local data changed since the last successful upload */
  pending: boolean;
  /** Uploads paused until the user picks restore vs. this phone's data */
  held: boolean;
  lastUploadedAt: string | null;
  /** What the server had at sign-in, shown in the held choice */
  serverSnapshot: ServerSnapshotInfo | null;
};

const KEY = "sync.state";
const DEFAULT: SyncState = {
  pending: false,
  held: false,
  lastUploadedAt: null,
  serverSnapshot: null,
};

const listeners = new Set<() => void>();
// Cached so useSyncExternalStore gets the same object until something changes
let cached: SyncState | null = null;

export const getSyncState = (): SyncState => {
  if (cached) return cached;

  try {
    const stored = Storage.getItemSync(KEY);
    cached = { ...DEFAULT, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    cached = DEFAULT;
  }
  return cached!;
};

/**
 * Re-renders subscribers; also called by session.ts when signing in or out. Hands out a new
 * snapshot object so useSyncExternalStore re-renders even when only the session changed.
 */
export const notifySyncListeners = () => {
  cached = { ...getSyncState() };
  listeners.forEach(listener => listener());
};

export const setSyncState = (changes: Partial<SyncState>) => {
  cached = { ...getSyncState(), ...changes };
  Storage.setItemSync(KEY, JSON.stringify(cached));
  notifySyncListeners();
};

export const subscribeSyncState = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Test helper: forget the in-memory copy so the next read hits storage. */
export const resetSyncStateCache = () => {
  cached = null;
};
