# API Auth and Snapshot Upload (Mobile) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Expo app into `mobile/`, then let a signed-in user upload a full snapshot of their data to the Spring API (and restore from it), without ever overwriting server data from a fresh phone.

**Architecture:** The phone stays the source of truth. Every data mutation calls `onDataChanged()`, which reschedules notifications and marks an upload pending; a debounced, queued `uploadSnapshot()` sends the existing backup JSON to `PUT /me/snapshot`. Sync state (token, user, pending, held, last upload) lives in the expo-sqlite kv-store and is exposed to React through `useSyncExternalStore`.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, expo-sqlite kv-store, drizzle-orm, `@react-native-google-signin/google-signin`, Jest (jest-expo, `@jest/globals`).

**Spec:** `docs/superpowers/specs/2026-10-10-api-auth-and-snapshot-upload-design.md`

**Out of this plan:** everything under `api/` — the user writes the Spring Boot API from spec §2. Tasks 1–9 are testable without the API (Jest with mocked `fetch`); Task 10 needs it running.

---

## Conventions for every task

- All paths after Task 1 are relative to the repo root `impulse/`; app code lives in `mobile/`. Run app commands from `mobile/`.
- Tests import from `@jest/globals` (`describe`, `it`, `expect`, `jest`, `beforeEach`).
- Format touched files: `npx prettier --write --trailing-comma es5 --print-width 100 --arrow-parens avoid <files>`.
- Typecheck: `npx tsc --noEmit` (from `mobile/`), expected: no output.
- Commits go through the user's `commit` skill. Format: `type: Capitalised subject of 3+ words`, body's last line `Changelog: <Feature|Fix|Refactor|Chore|Test|Docs>`, no Co-authored-by trailer.

## File structure (after this plan)

```
impulse/
  .gitignore                       # new, root-level (OS junk only)
  docs/                            # stays at root
  api/                             # user's Spring project (not touched here)
  mobile/                          # everything that was at the root before
    app/settings.tsx               # modified: uses SettingsRows, AccountSection, restore source
    app/_layout.tsx                # modified: upload on start/active
    src/api/client.ts              # new: apiFetch, ApiError, NetworkError, API_URL
    src/api/session.ts             # new: token/user/lastUserId in kv-store
    src/api/auth.ts                # new: completeSignIn (pure-ish), Google + dev sign-in, signOut
    src/sync/syncState.ts          # new: pending/held/lastUploadedAt + change listeners
    src/sync/localSnapshot.ts      # new: reads all rows → Backup
    src/sync/upload.ts             # new: markDataChanged, uploadSnapshot, fetchServerSnapshot, markRestoredFromServer
    src/sync/useSyncStatus.ts      # new: React hook over syncState + session
    src/data/onDataChanged.ts      # new: reschedule + markDataChanged
    src/settings/SettingsRows.tsx  # new: Section/Row/Divider moved out of settings.tsx
    src/settings/AccountSection.tsx# new: Account UI
    src/backup/fileBackup.ts       # modified: uses localSnapshot
    src/db/presets.ts              # modified: markDataChanged after writes
    src/components/calendar/addSheet/AddSheet.tsx        # modified
    src/components/calendar/event/EditEventModal.tsx     # modified
    src/test/kvStoreMock.ts        # new: in-memory kv-store for Jest
```

---

### Task 1: Move the app into `mobile/`

**Files:**
- Move: every git-tracked path except `docs/` → `mobile/`
- Move (untracked, plain `mv`): `.env`, `.expo`, `android`, `ios`, `node_modules`, `expo-env.d.ts` → `mobile/`
- Create: `.gitignore` (repo root)

- [ ] **Step 1: Confirm a clean tree**

Run: `git status --short`
Expected: no output (the plan and spec are committed before execution starts). If anything is listed, stop and ask the user.

- [ ] **Step 2: Move tracked files**

```bash
mkdir mobile
for p in $(git ls-files | cut -d/ -f1 | sort -u | grep -v '^docs$'); do git mv "$p" mobile/; done
```

- [ ] **Step 3: Move untracked local files**

```bash
for p in .env .expo android ios node_modules expo-env.d.ts; do [ -e "$p" ] && mv "$p" mobile/; done
ls -a
```
Expected: only `.git`, `docs`, `mobile` (and `api` if the user already created it). `.gitignore` moved into `mobile/` with the other tracked files.

- [ ] **Step 4: Add a root `.gitignore`**

```gitignore
.DS_Store
.idea/
.vscode/
```

- [ ] **Step 5: Verify the app still builds from `mobile/`**

```bash
cd mobile
npx tsc --noEmit
npx jest
npx expo-doctor
npx expo export --platform android --output-dir /tmp/impulse-export
```
Expected: tsc silent; Jest `Tests: 33 passed`; doctor `21/21 checks passed`; export ends with `Exported:`. If Metro complains about `../api`, add to `mobile/metro.config.js` before `module.exports`: `config.watchFolders = [__dirname];` and re-run.

First native build after the move must be `npm run android:clean` (not `npm run android`): `android/` was moved with `mv`, and Gradle/CMake caches hold absolute paths. `android:clean` regenerates it.

- [ ] **Step 6: Verify history follows**

Run: `git log --follow --oneline -3 mobile/src/notifications/digest.ts`
Expected: shows commits from before the move.

- [ ] **Step 7: Commit**

```bash
cd ..
git add -A
git status --short | head   # only renames (R) + new .gitignore
```
Commit with the `commit` skill, e.g. `chore: Move Expo app into mobile folder` / body: `Makes room for the Spring API in api/.` / `Changelog: Chore`.

---

### Task 2: In-memory kv-store for tests + session storage

**Files:**
- Create: `mobile/src/test/kvStoreMock.ts`
- Create: `mobile/src/api/session.ts`
- Test: `mobile/src/api/__tests__/session.test.ts`

- [ ] **Step 1: Write the kv-store mock**

`mobile/src/test/kvStoreMock.ts`:
```ts
// In-memory stand-in for expo-sqlite/kv-store's synchronous Storage in Jest
const items = new Map<string, string>();

export const Storage = {
  getItemSync: (key: string) => items.get(key) ?? null,
  setItemSync: (key: string, value: string) => {
    items.set(key, value);
  },
  removeItemSync: (key: string) => items.delete(key),
  clearSync: () => {
    items.clear();
    return true;
  },
};
```

- [ ] **Step 2: Write the failing test**

`mobile/src/api/__tests__/session.test.ts`:
```ts
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { clearSession, getLastUserId, getSession, saveSession } from "../session";

const user = { id: 7, email: "me@example.com", name: "Me" };

describe("session", () => {
  beforeEach(() => {
    Storage.clearSync();
  });

  it("is null when nothing is stored", () => {
    expect(getSession()).toBeNull();
  });

  it("round-trips token and user and remembers the user id", () => {
    saveSession({ token: "jwt", user });

    expect(getSession()).toEqual({ token: "jwt", user });
    expect(getLastUserId()).toBe(7);
  });

  it("clearSession removes token and user but keeps the last user id", () => {
    saveSession({ token: "jwt", user });
    clearSession();

    expect(getSession()).toBeNull();
    expect(getLastUserId()).toBe(7);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx jest src/api/__tests__/session.test.ts`
Expected: FAIL, `Cannot find module '../session'`.

- [ ] **Step 4: Implement**

`mobile/src/api/session.ts`:
```ts
import { Storage } from "expo-sqlite/kv-store";

export type SessionUser = { id: number; email: string; name: string | null };
export type Session = { token: string; user: SessionUser };

const TOKEN = "sync.token";
const USER = "sync.user";
const LAST_USER_ID = "sync.lastUserId";

export const getSession = (): Session | null => {
  const token = Storage.getItemSync(TOKEN);
  const user = Storage.getItemSync(USER);
  if (!token || !user) return null;

  try {
    return { token, user: JSON.parse(user) };
  } catch {
    return null;
  }
};

export const saveSession = (session: Session) => {
  Storage.setItemSync(TOKEN, session.token);
  Storage.setItemSync(USER, JSON.stringify(session.user));
  Storage.setItemSync(LAST_USER_ID, String(session.user.id));
};

/** Signs out locally. Keeps the last user id so the same account signing back in isn't held. */
export const clearSession = () => {
  Storage.removeItemSync(TOKEN);
  Storage.removeItemSync(USER);
};

export const getLastUserId = (): number | null => {
  const id = Storage.getItemSync(LAST_USER_ID);
  return id ? Number(id) : null;
};
```

- [ ] **Step 5: Run the test**

Run: `npx jest src/api/__tests__/session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit** — `feat: Store API session in kv-store` / `Changelog: Feature`.

---

### Task 3: Sync state with change listeners

**Files:**
- Create: `mobile/src/sync/syncState.ts`
- Test: `mobile/src/sync/__tests__/syncState.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import {
  getSyncState,
  resetSyncStateCache,
  setSyncState,
  subscribeSyncState,
} from "../syncState";

describe("syncState", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
  });

  it("defaults to nothing pending, not held, never uploaded", () => {
    expect(getSyncState()).toEqual({
      pending: false,
      held: false,
      lastUploadedAt: null,
      serverSnapshot: null,
    });
  });

  it("persists partial updates", () => {
    setSyncState({ pending: true });
    setSyncState({ lastUploadedAt: "2026-10-10T09:00:00.000Z" });

    expect(getSyncState()).toEqual({
      pending: true,
      held: false,
      lastUploadedAt: "2026-10-10T09:00:00.000Z",
      serverSnapshot: null,
    });
  });

  it("notifies subscribers and returns a stable snapshot between changes", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSyncState(listener);

    const before = getSyncState();
    expect(getSyncState()).toBe(before);

    setSyncState({ held: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getSyncState()).not.toBe(before);

    unsubscribe();
    setSyncState({ held: false });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to see it fail** — `npx jest src/sync/__tests__/syncState.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

`mobile/src/sync/syncState.ts`:
```ts
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
```

- [ ] **Step 4: Run the test** → PASS (3 tests).

- [ ] **Step 5: Make session changes notify listeners**

In `mobile/src/api/session.ts` (Task 2) add `import { notifySyncListeners } from "../sync/syncState";`. Call `notifySyncListeners()` as the last line of `saveSession` and of `clearSession`, so the Settings UI re-renders on sign-in, sign-out and a 401. `syncState` doesn't import `session`, so there's no cycle. Re-run `npx jest src/api src/sync` → all pass.

- [ ] **Step 6: Commit** — `feat: Track snapshot upload state` / `Changelog: Feature`.

---

### Task 4: API client

**Files:**
- Create: `mobile/src/api/client.ts`
- Test: `mobile/src/api/__tests__/client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));

import { Storage } from "../../test/kvStoreMock";
import { apiFetch, ApiError, NetworkError } from "../client";
import { saveSession } from "../session";

const fetchMock = jest.fn<typeof fetch>();

describe("apiFetch", () => {
  beforeEach(() => {
    Storage.clearSync();
    global.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });
  afterEach(() => {
    fetchMock.mockReset();
  });

  it("sends JSON with the bearer token and parses the response", async () => {
    saveSession({ token: "jwt", user: { id: 1, email: "a@b.c", name: null } });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await apiFetch<{ ok: boolean }>("/me/snapshot", { method: "PUT", body: { a: 1 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/me/snapshot");
    expect(init?.method).toBe("PUT");
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt");
  });

  it("omits Authorization when signed out", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await apiFetch("/auth/google", { method: "POST", body: {} });

    expect((fetchMock.mock.calls[0][1]?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws ApiError with status and server message on non-2xx", async () => {
    fetchMock.mockResolvedValue(new Response('{"error":"Bad snapshot"}', { status: 400 }));

    await expect(apiFetch("/me/snapshot")).rejects.toEqual(new ApiError(400, "Bad snapshot"));
  });

  it("throws NetworkError when fetch itself fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiFetch("/me/snapshot")).rejects.toBeInstanceOf(NetworkError);
  });
});
```

- [ ] **Step 2: Run it to see it fail** → module not found.

- [ ] **Step 3: Implement**

`mobile/src/api/client.ts`:
```ts
import { getSession } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export class NetworkError extends Error {}

/** Base URL of the API, or undefined when this build isn't configured for one. */
export const getApiUrl = () => process.env.EXPO_PUBLIC_API_URL || undefined;

type Init = { method?: "GET" | "POST" | "PUT"; body?: unknown };

export const apiFetch = async <T = unknown>(path: string, { method = "GET", body }: Init = {}) => {
  const apiUrl = getApiUrl();
  if (!apiUrl) throw new NetworkError("API URL is not configured");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getSession()?.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new NetworkError(String(error));
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) throw new ApiError(response.status, data?.error ?? `HTTP ${response.status}`);

  return data as T;
};
```

Note: `EXPO_PUBLIC_*` is inlined at build time by Babel, but in Jest it's read from `process.env` at call time — which is why `getApiUrl()` reads it inside the function.

- [ ] **Step 4: Run the test** → PASS (4 tests).

- [ ] **Step 5: Commit** — `feat: Add API fetch client` / `Changelog: Feature`.

---

### Task 5: Local snapshot source (+ reuse in file backup)

**Files:**
- Create: `mobile/src/sync/localSnapshot.ts`
- Modify: `mobile/src/backup/fileBackup.ts` (`buildBackupFile`)

No unit test: this is a thin DB read. It's covered by the upload tests through a mock, and by Task 9's manual check.

- [ ] **Step 1: Create the module**

`mobile/src/sync/localSnapshot.ts`:
```ts
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
```

- [ ] **Step 2: Use it in `fileBackup.ts`**

Replace `buildBackupFile` with:
```ts
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
```
Imports: add `import { buildLocalSnapshot } from "../sync/localSnapshot";`. Change `import { Backup, createBackup, parseBackup } from "./backup";` to `import { Backup, parseBackup } from "./backup";`. `db`, `eventsTable` and `presetsTable` are still used by `restoreBackup`, so keep those imports.

- [ ] **Step 3: Typecheck and test** — `npx tsc --noEmit && npx jest` → silent, all tests pass.

- [ ] **Step 4: Commit** — `refactor: Share local snapshot builder with file backup` / `Changelog: Refactor`.

---

### Task 6: Upload, restore helpers (TDD)

**Files:**
- Create: `mobile/src/sync/upload.ts`
- Test: `mobile/src/sync/__tests__/upload.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));
jest.mock("../localSnapshot", () => ({
  buildLocalSnapshot: jest.fn(async () => ({
    app: "impulse",
    version: 1,
    exportedAt: "2026-10-10T09:00:00.000Z",
    events: [],
    presets: [],
  })),
}));
jest.mock("../../api/client", () => {
  const actual = jest.requireActual<typeof import("../../api/client")>("../../api/client");
  return { ...actual, apiFetch: jest.fn() };
});

import { apiFetch, ApiError, NetworkError } from "../../api/client";
import { getSession, saveSession } from "../../api/session";
import { Storage } from "../../test/kvStoreMock";
import { getSyncState, resetSyncStateCache, setSyncState } from "../syncState";
import {
  markDataChanged,
  markRestoredFromServer,
  UPLOAD_DEBOUNCE_MS,
  uploadSnapshot,
} from "../upload";

const api = apiFetch as jest.MockedFunction<typeof apiFetch>;
const signIn = () => saveSession({ token: "jwt", user: { id: 1, email: "a@b.c", name: null } });

describe("uploadSnapshot", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
  });

  it("does nothing when signed out and stays pending", async () => {
    setSyncState({ pending: true });
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
    expect(getSyncState().pending).toBe(true);
  });

  it("does nothing when nothing is pending", async () => {
    signIn();
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
  });

  it("does nothing while held", async () => {
    signIn();
    setSyncState({ pending: true, held: true });
    await uploadSnapshot();

    expect(api).not.toHaveBeenCalled();
    expect(getSyncState().pending).toBe(true);
  });

  it("PUTs the snapshot, clears pending and records the time", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockResolvedValue({ events: 0, presets: 0, receivedAt: "x" });

    await uploadSnapshot();

    expect(api).toHaveBeenCalledWith("/me/snapshot", {
      method: "PUT",
      body: expect.objectContaining({ app: "impulse", version: 1 }),
    });
    expect(getSyncState().pending).toBe(false);
    expect(getSyncState().lastUploadedAt).not.toBeNull();
  });

  it("signs out on 401 and keeps pending", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockRejectedValue(new ApiError(401, "Expired"));

    await uploadSnapshot();

    expect(getSession()).toBeNull();
    expect(getSyncState().pending).toBe(true);
  });

  it("keeps pending on network errors", async () => {
    signIn();
    setSyncState({ pending: true });
    api.mockRejectedValue(new NetworkError("offline"));

    await uploadSnapshot();

    expect(getSession()).not.toBeNull();
    expect(getSyncState().pending).toBe(true);
  });
});

describe("markDataChanged", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
    api.mockResolvedValue({});
    jest.useFakeTimers();
  });

  it("marks pending even when signed out, without uploading", async () => {
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS);

    expect(getSyncState().pending).toBe(true);
    expect(api).not.toHaveBeenCalled();
  });

  it("collapses changes within the debounce into one upload", async () => {
    signIn();
    markDataChanged();
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS - 1);
    markDataChanged();
    await jest.advanceTimersByTimeAsync(UPLOAD_DEBOUNCE_MS);

    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe("markRestoredFromServer", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    api.mockReset();
    jest.useRealTimers();
  });

  it("clears pending and held so no upload follows", async () => {
    signIn();
    setSyncState({ pending: true, held: true });

    markRestoredFromServer();
    await uploadSnapshot();

    expect(getSyncState()).toMatchObject({ pending: false, held: false });
    expect(getSyncState().lastUploadedAt).not.toBeNull();
    expect(api).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them to see them fail** — `npx jest src/sync/__tests__/upload.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement**

`mobile/src/sync/upload.ts`:
```ts
import { apiFetch, ApiError } from "../api/client";
import { clearSession, getSession } from "../api/session";
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
  if (!getSession() || !pending || held) return;

  try {
    await apiFetch("/me/snapshot", { method: "PUT", body: await buildLocalSnapshot() });
    setSyncState({ pending: false, lastUploadedAt: new Date().toISOString() });
  } catch (error) {
    // Pending stays set either way, so the next app open retries
    if (error instanceof ApiError && error.status === 401) clearSession();
    else console.warn("Snapshot upload failed", error);
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
  });
```

- [ ] **Step 4: Run the tests** → PASS (9 tests). If `advanceTimersByTimeAsync` is missing, check `jest --version` ≥ 29.5.

- [ ] **Step 5: Commit** — `feat: Upload snapshots after data changes` / `Changelog: Feature`.

---

### Task 7: Sign-in (dev + Google) with the first-sign-in hold

**Files:**
- Modify: `mobile/package.json`, `mobile/app.config.ts` (plugin)
- Create: `mobile/src/api/auth.ts`
- Test: `mobile/src/api/__tests__/auth.test.ts`

- [ ] **Step 1: Install Google sign-in**

```bash
cd mobile
npx expo install @react-native-google-signin/google-signin
```
Add `"@react-native-google-signin/google-signin"` to `plugins` in `mobile/app.config.ts`, after `"@react-native-community/datetimepicker"`. Read the package README's Expo section first: without Firebase the plugin may need options (e.g. `iosUrlScheme` for iOS). Android needs none, but if the plugin errors without options, pass the iOS scheme from the README's placeholder or `{}`. Run `npx expo config --type prebuild > /dev/null` to confirm the plugin loads. Check the installed version's API in `node_modules/@react-native-google-signin/google-signin/lib/typescript` (v13+ has `GoogleSignin.signIn()` returning `{ type: "success", data: { idToken } }` and `isSuccessResponse`). Adjust Step 4 if it differs.

- [ ] **Step 2: Write the failing tests**

`mobile/src/api/__tests__/auth.test.ts`:
```ts
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("expo-sqlite/kv-store", () => require("../../test/kvStoreMock"));
jest.mock("@react-native-google-signin/google-signin", () => ({}));
jest.mock("../../sync/upload", () => ({ uploadSnapshot: jest.fn(async () => {}) }));

import { uploadSnapshot } from "../../sync/upload";
import { getSyncState, resetSyncStateCache, setSyncState } from "../../sync/syncState";
import { Storage } from "../../test/kvStoreMock";
import { AuthResponse, completeSignIn } from "../auth";
import { getSession, saveSession } from "../session";

const upload = uploadSnapshot as jest.MockedFunction<typeof uploadSnapshot>;
const user = { id: 3, email: "me@example.com", name: "Me" };
const response = (snapshot: AuthResponse["snapshot"]): AuthResponse => ({
  token: "jwt",
  user,
  snapshot,
});

describe("completeSignIn", () => {
  beforeEach(() => {
    Storage.clearSync();
    resetSyncStateCache();
    upload.mockClear();
  });

  it("saves the session", async () => {
    await completeSignIn(response(null));
    expect(getSession()).toEqual({ token: "jwt", user });
  });

  it("uploads straight away when the server is empty", async () => {
    await completeSignIn(response(null));

    expect(getSyncState()).toMatchObject({ pending: true, held: false });
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("holds uploads when the server already has data", async () => {
    await completeSignIn(response({ receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 }));

    expect(getSyncState()).toMatchObject({
      held: true,
      serverSnapshot: { receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 },
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it("does not hold when the same user signs back in after uploading before", async () => {
    saveSession({ token: "old", user });
    setSyncState({ lastUploadedAt: "2026-10-09T10:00:00Z", pending: true });

    await completeSignIn(response({ receivedAt: "2026-10-09T10:00:00Z", events: 1509, presets: 6 }));

    expect(getSyncState().held).toBe(false);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("holds when a different user signs in on this phone", async () => {
    saveSession({ token: "old", user: { ...user, id: 99 } });
    setSyncState({ lastUploadedAt: "2026-10-09T10:00:00Z" });

    await completeSignIn(response({ receivedAt: "2026-10-09T10:00:00Z", events: 5, presets: 1 }));

    expect(getSyncState().held).toBe(true);
  });
});
```

- [ ] **Step 3: Run them to see them fail** → module not found.

- [ ] **Step 4: Implement**

`mobile/src/api/auth.ts`:
```ts
import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { getSyncState, ServerSnapshotInfo, setSyncState } from "../sync/syncState";
import { uploadSnapshot } from "../sync/upload";
import { apiFetch } from "./client";
import { clearSession, getLastUserId, saveSession, SessionUser } from "./session";

export type AuthResponse = {
  token: string;
  user: SessionUser;
  snapshot: ServerSnapshotInfo | null;
};

export const isDevBuild = process.env.EXPO_PUBLIC_APP_VARIANT === "development";

/**
 * Stores the session and decides whether uploads may start. A phone that hasn't uploaded
 * to this account before must not overwrite server data, so it's held until the user chooses.
 */
export const completeSignIn = async ({ token, user, snapshot }: AuthResponse) => {
  const sameAccountAsBefore =
    getLastUserId() === user.id && getSyncState().lastUploadedAt !== null;

  saveSession({ token, user });

  if (snapshot && !sameAccountAsBefore) {
    setSyncState({ held: true, serverSnapshot: snapshot });
    return;
  }

  setSyncState({ held: false, pending: sameAccountAsBefore ? getSyncState().pending : true });
  await uploadSnapshot();
};

const exchange = async (idToken: string) => {
  const response = await apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    body: { idToken },
  });
  await completeSignIn(response);
};

/** Returns false when the user cancelled the Google dialog. */
export const signInWithGoogle = async () => {
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices();

  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result) || !result.data.idToken) return false;

  await exchange(result.data.idToken);
  return true;
};

/** Only works against an API running the dev profile. */
export const signInAsDevUser = () => exchange("dev");

export const signOut = async () => {
  clearSession();
  if (!isDevBuild) await GoogleSignin.signOut().catch(() => {});
};
```

Note: in the "same account" branch, `pending` keeps its current value. If nothing changed while signed out there's nothing to send, so `uploadSnapshot()` is a no-op.

- [ ] **Step 5: Run the tests** → PASS (5 tests). Then `npx tsc --noEmit` → silent.

- [ ] **Step 6: Commit** — `feat: Sign in to the API with Google or dev user` / `Changelog: Feature`.

---

### Task 8: Report data changes everywhere + upload on start

**Files:**
- Create: `mobile/src/data/onDataChanged.ts`
- Modify: `mobile/src/components/calendar/addSheet/AddSheet.tsx` (add ~line 95, undo ~line 114)
- Modify: `mobile/src/components/calendar/event/EditEventModal.tsx` (delete ~88, lock ~99, colour ~117)
- Modify: `mobile/src/db/presets.ts` (all five writers)
- Modify: `mobile/app/_layout.tsx` (start + AppState)

- [ ] **Step 1: Create `onDataChanged`**

```ts
import { rescheduleDailyDigest } from "../notifications/dailyDigest";
import { markDataChanged } from "../sync/upload";

/** Call after any change to events or presets that should reach notifications and the server. */
export const onDataChanged = () => {
  rescheduleDailyDigest();
  markDataChanged();
};
```

- [ ] **Step 2: Events**

- `AddSheet.tsx`: replace both `rescheduleDailyDigest();` calls (in `addEvent` and `undoAdd`) with `onDataChanged();`. Swap the import to `import { onDataChanged } from "../../../data/onDataChanged";`.
- `EditEventModal.tsx`:
  - Replace `rescheduleDailyDigest();` in the delete handler with `onDataChanged();`.
  - Add `onDataChanged();` after `updateEvent({ locked });` in the lock handler, and after `updateEvent({ color });` in `ColorPicker`'s `onPick`.
  - Swap the import the same way.

- [ ] **Step 3: Presets (data layer)**

In `mobile/src/db/presets.ts` add `import { markDataChanged } from "../sync/upload";` and call `markDataChanged()`:
- `createPreset`: after the insert, before `return preset;`
- `updatePreset`: make it `async`, `await` the update, then call it.
- `deletePreset`: same as `updatePreset`.
- `setPresetPinned`: after the update, before `return true;` (not on the early `return false`).
- `movePinnedPreset`: after the loop.

Callers already `await` these, so changing `updatePreset`/`deletePreset` from returning the drizzle query to `async` functions returning `void` is safe. Confirm with `npx tsc --noEmit`.

- [ ] **Step 4: Upload on start and resume**

In `mobile/app/_layout.tsx` add `import { uploadSnapshot } from "../src/sync/upload";`. Change `RootLayoutNav`'s effect so that:
- the start IIFE calls `uploadSnapshot();` after `rescheduleDailyDigest();`;
- the AppState listener becomes:
```ts
if (state === "active") {
  rescheduleDailyDigest();
  uploadSnapshot();
}
```
Do **not** touch the preset seed in `RootLayout`; it must not mark data changed.

- [ ] **Step 5: Verify no direct reschedule remains at mutation sites**

Run: `grep -rn "rescheduleDailyDigest()" src app`
Expected exactly these matches:
- `src/data/onDataChanged.ts`;
- `app/_layout.tsx` (two);
- `app/settings.tsx` (three: two notification settings plus `replaceWith`, which Task 9 changes).

- [ ] **Step 6: Typecheck + tests** — `npx tsc --noEmit && npx jest` → silent; all suites pass.

- [ ] **Step 7: Commit** — `feat: Mark data for upload on every change` / `Changelog: Feature`.

---

### Task 9: Account section in Settings

**Files:**
- Create: `mobile/src/settings/SettingsRows.tsx` (move `Section`, `Row`, `Divider` out of `app/settings.tsx` unchanged, exported)
- Create: `mobile/src/sync/useSyncStatus.ts`
- Create: `mobile/src/settings/AccountSection.tsx`
- Modify: `mobile/app/settings.tsx`

- [ ] **Step 1: Move the row components**

Cut `Section`, `Row`, `Divider` from `app/settings.tsx` into `src/settings/SettingsRows.tsx` with `export const`, along with the imports they need (`Ionicons`, `ReactNode`, `ActivityIndicator`, `Pressable`, `View`, `P`). Import them back in `settings.tsx`. Run `npx tsc --noEmit` → silent.

- [ ] **Step 2: Hook over sync + session state**

`mobile/src/sync/useSyncStatus.ts`:
```ts
import { useSyncExternalStore } from "react";
import { getSession } from "../api/session";
import { getSyncState, subscribeSyncState } from "./syncState";

/** Sync state plus the current session; re-renders on any change to either. */
export const useSyncStatus = () => {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);
  return { ...state, session: getSession() };
};
```

- [ ] **Step 3: The Account section**

`mobile/src/settings/AccountSection.tsx`:
```tsx
import { formatDistanceToNow, format } from "date-fns";
import React, { useState } from "react";
import { Alert } from "react-native";
import { getApiUrl } from "../api/client";
import { isDevBuild, signInAsDevUser, signInWithGoogle, signOut } from "../api/auth";
import { Backup } from "../backup/backup";
import { setSyncState } from "../sync/syncState";
import { fetchServerSnapshot, uploadSnapshot } from "../sync/upload";
import { useSyncStatus } from "../sync/useSyncStatus";
import { Divider, Row, Section } from "./SettingsRows";

interface Props {
  /** Shows the "Replace all data?" confirm and restores; source decides upload behaviour */
  onRestore: (backup: Backup, source: "server") => void;
}

export const AccountSection = ({ onRestore }: Props) => {
  const { session, pending, held, lastUploadedAt, serverSnapshot } = useSyncStatus();
  const [busy, setBusy] = useState<"signin" | "upload" | "restore" | null>(null);

  if (!getApiUrl()) return null;

  const run = async (kind: typeof busy, action: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      Alert.alert("Something went wrong", String(error));
    } finally {
      setBusy(null);
    }
  };

  const restore = () =>
    run("restore", async () => onRestore(await fetchServerSnapshot(), "server"));

  if (!session) {
    return (
      <Section title="Account">
        <Row
          icon="logo-google"
          title="Sign in with Google"
          subtitle={
            pending ? "Signed out — sign in again to upload" : "Back up your trainings to your account"
          }
          busy={busy === "signin"}
          onPress={() => run("signin", signInWithGoogle)}
        />
        {isDevBuild && (
          <>
            <Divider />
            <Row
              icon="construct-outline"
              title="Continue as dev user"
              disabled={busy === "signin"}
              onPress={() => run("signin", signInAsDevUser)}
            />
          </>
        )}
      </Section>
    );
  }

  if (held) {
    const summary = serverSnapshot
      ? `This account has ${serverSnapshot.events} trainings from ${format(serverSnapshot.receivedAt, "d MMM")}.`
      : "This account already has data.";

    return (
      <Section title="Account">
        <Row icon="cloud-outline" title={session.user.email} subtitle={summary} />
        <Divider />
        <Row
          icon="cloud-download-outline"
          title="Restore from server"
          subtitle="Replace this phone's data"
          busy={busy === "restore"}
          onPress={restore}
        />
        <Divider />
        <Row
          icon="phone-portrait-outline"
          title="Use this phone's data"
          subtitle="Replace the server copy"
          busy={busy === "upload"}
          onPress={() =>
            run("upload", async () => {
              setSyncState({ held: false, pending: true, serverSnapshot: null });
              await uploadSnapshot();
            })
          }
        />
      </Section>
    );
  }

  const uploadedText = lastUploadedAt
    ? `Last uploaded ${formatDistanceToNow(lastUploadedAt, { addSuffix: true })}`
    : "Not uploaded yet";

  return (
    <Section title="Account">
      <Row
        icon="cloud-done-outline"
        title={session.user.email}
        subtitle={pending ? `${uploadedText} · changes waiting` : uploadedText}
      />
      <Divider />
      <Row
        icon="cloud-upload-outline"
        title="Upload now"
        busy={busy === "upload"}
        onPress={() =>
          run("upload", async () => {
            setSyncState({ pending: true });
            await uploadSnapshot();
          })
        }
      />
      <Divider />
      <Row
        icon="cloud-download-outline"
        title="Restore from server"
        busy={busy === "restore"}
        onPress={restore}
      />
      <Divider />
      <Row icon="log-out-outline" title="Sign out" onPress={() => run(null, signOut)} />
    </Section>
  );
};
```

- [ ] **Step 4: Restore source in `settings.tsx`**

- Change `replaceWith` to `replaceWith(backup: Backup, source: "file" | "server")`. Import `Backup` from `../src/backup/backup`.
- After `reloadEvents();`, replace `rescheduleDailyDigest();` with:
```ts
if (source === "file") {
  onDataChanged();
} else {
  rescheduleDailyDigest();
  markRestoredFromServer();
}
```
- Pull the confirm `Alert` out of `onImport` into `confirmReplace(backup, source)`. `onImport` calls `confirmReplace(backup, "file")`.
- Render `<AccountSection onRestore={confirmReplace} />` as the first section inside the `ScrollView`, above Notifications.
- Imports: `onDataChanged` from `../src/data/onDataChanged`, `markRestoredFromServer` from `../src/sync/upload`, `AccountSection` from `../src/settings/AccountSection`.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npx jest
npx expo export --platform android --output-dir /tmp/impulse-export
grep -rn "rescheduleDailyDigest()" src app
```
Expected:
- tsc is silent;
- all tests pass;
- the export ends with `Exported:`;
- grep finds `onDataChanged.ts`, `_layout.tsx` ×2, and `settings.tsx` ×3 (two notification settings plus the `"server"` branch).

- [ ] **Step 6: Commit** — `feat: Add account section with upload and restore` / `Changelog: Feature`.

---

### Task 10: Config and on-device check (needs the user's API)

**Files:**
- Modify: `mobile/.env` (untracked; documented in the spec)
- Modify: `mobile/eas.json` (only if a deployed URL exists; otherwise skip)

- [ ] **Step 1: Ask the user for:**
- whether `api/` runs locally on the `dev` profile (`./gradlew bootRun --args='--spring.profiles.active=dev'`);
- the Mac's LAN IP (`ipconfig getifaddr en0`);
- the Google **web** OAuth client ID. This can wait: dev sign-in works without it.

- [ ] **Step 2: Set env** — add to `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://<lan-ip>:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id or leave out>
```

- [ ] **Step 3: Android cleartext.** Release builds block `http://`, but the dev build (`npm run android`, debug) allows it. Only test with the dev build. Note for later: deployed API must be `https`.

- [ ] **Step 4: Rebuild the dev app** — `npm run android:clean` (Google sign-in is a new native module).

- [ ] **Step 5: Manual check (from the spec)**
1. Settings → **Continue as dev user**. The seeded server data means the held choice appears with a count.
2. **Use this phone's data** → "Last uploaded just now".
3. Add a workout. Within about 5 s, `psql` on the dev database shows it: `select title, start_at from event order by id desc limit 1;`.
4. Delete it locally → **Restore from server** → confirm. It comes back, and "changes waiting" is not shown.
5. Stop the API, add a workout → "changes waiting". Start the API, background the app and reopen it → uploaded.

- [ ] **Step 6: Report** what passed and what didn't. No commit unless code changed.
