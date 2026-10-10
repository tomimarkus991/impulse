import { apiFetch, ApiError } from "../api/client";
import { getSession } from "../api/session";
import { Backup, parseBackup } from "../backup/backup";
import { buildLocalSnapshot } from "./localSnapshot";
import { getSyncState, setSyncState } from "./syncState";

export const UPLOAD_DEBOUNCE_MS = 5000;

let timer: ReturnType<typeof setTimeout> | null = null;

/** Call after any local data change. Uploads after a short pause if signed in. */
export const markDataChanged = () => {
  setSyncState({ pending: true });
  if (!getSession()) return;

  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    uploadSnapshot();
  }, UPLOAD_DEBOUNCE_MS);
};

const upload = async () => {
  const { pending, held } = getSyncState();
  const session = getSession();
  if (!session || !pending || held) return;

  try {
    await apiFetch("/me/snapshot", { method: "PUT", body: await buildLocalSnapshot() });
    setSyncState({
      pending: false,
      lastUploadedAt: new Date().toISOString(),
      lastSyncedUserId: session.user.id,
    });
  } catch (error) {
    // Pending stays set either way, so the next app open retries. apiFetch signs out on 401.
    if (!(error instanceof ApiError && error.status === 401)) {
      console.warn("Snapshot upload failed", error);
    }
  }
};

// Chain calls so two uploads never run at once
let queue = Promise.resolve();

export const uploadSnapshot = () => {
  queue = queue.then(upload);
  return queue;
};

/** Downloads the server copy without touching local data. */
export const fetchServerSnapshot = async (): Promise<Backup> =>
  parseBackup(JSON.stringify(await apiFetch("/me/snapshot")));

/** After restoring from the server, local data equals the server copy: nothing to upload. */
export const markRestoredFromServer = () =>
  setSyncState({
    pending: false,
    held: false,
    serverSnapshot: null,
    lastUploadedAt: new Date().toISOString(),
    lastSyncedUserId: getSession()?.user.id ?? null,
  });
