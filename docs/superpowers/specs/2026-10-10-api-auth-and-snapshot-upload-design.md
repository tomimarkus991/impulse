# API: Auth and Snapshot Upload — Design

**Date:** 2026-10-10
**Status:** Approved in brainstorming and spec review

## Goal

Get the user's workout data onto a server they own, so a future AI coach (separate spec) can read it, while the phone stays the only source of truth and keeps working offline. This is also a Spring Boot learning project.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Sync model | **One-way snapshot upload** (phone → server). No pull-merge, no conflicts. | Two-way sync is costly to build and taxes every future feature. Not needed for the coach or for one device. Can be added later on the same tables. |
| Restore | `GET /me/snapshot` + existing restore flow | A new phone restores once, like file import. |
| Auth | **Google sign-in**, token exchanged for the API's own JWT (gatherr pattern) | No passwords stored; Google tokens expire hourly so we issue our own. |
| Dev auth | `dev` profile skips Google and signs in as `dev@impulse.app` (gatherr pattern) | No Google round-trip while developing. |
| Monetization | Out of scope. Paywall later goes on the coach, not on upload. | No users yet; coach has real per-message cost. |
| Repo layout | `impulse/mobile` (Expo app) + `impulse/api` (Spring Boot) | User preference. `mobile` avoids an `app/app` path clash with Expo Router. |
| API stack | Spring Boot 4.1.1, Java 25, Gradle (Kotlin DSL), Postgres, Flyway | Chosen on start.spring.io. |

## 1. Repository restructure

- Move every tracked file of the current repo root into `mobile/` with `git mv` (history follows), except `docs/`, which stays at the repo root.
- `api/` is created and filled by the user from their start.spring.io download.
- Exclude `../api` from Metro's watch (not needed if Metro's project root is `mobile/`; verify).
- `eas.json`, `package.json` scripts, `.env`, `app.config.ts` all live in `mobile/`; builds run from `impulse/mobile`.
- This move is its own commit, before any feature work, and must leave `npx tsc`, `npx jest`, `npx expo-doctor` and an Android bundle export green.

## 2. API (`impulse/api`)

The user writes the API; this section is the contract and shape it must satisfy.

### Dependencies

Spring Web, Validation, Spring Data JPA, PostgreSQL Driver, Flyway, Spring Security, OAuth2 Resource Server, Docker Compose Support, Testcontainers, DevTools, Actuator.

### Database (Flyway `V1__init.sql`)

- `app_user`: `id bigserial pk`, `google_sub text unique not null`, `email text not null`, `name text`, `created_at timestamptz not null default now()`, `last_snapshot_at timestamptz`
- `event`: `id bigserial pk`, `user_id bigint not null references app_user on delete cascade`, `local_id int not null`, `title text not null`, `color text not null`, `start_at timestamptz not null`, `end_at timestamptz not null`, `locked boolean not null default false`; index on `(user_id, start_at)`
- `preset`: `id bigserial pk`, `user_id bigint not null references app_user on delete cascade`, `local_id int not null`, `title text not null`, `color text not null`, `locked boolean not null default false`, `pinned boolean not null default false`, `position int not null default 0`; index on `user_id`

`local_id` stores the phone's integer id so a snapshot round-trips exactly. The dev user's `google_sub` is `dev`.

### Endpoints

**`POST /auth/google`** (public)
- Request: `{ "idToken": string }`
- Verify via a `JwtDecoder` for Google (`https://www.googleapis.com/oauth2/v3/certs`): signature, `iss` ∈ {`https://accounts.google.com`, `accounts.google.com`}, `aud` ∈ configured client IDs (`app.auth.google-client-ids`), `email_verified == true`.
- Find user by `sub`, create if missing (update email/name on each login).
- Response `200`: `{ "token": string, "user": { "id": number, "email": string, "name": string | null }, "snapshot": { "receivedAt": string, "events": number, "presets": number } | null }`. `snapshot` is `null` when `last_snapshot_at` is null; otherwise `receivedAt` = `last_snapshot_at` and the counts are the account's current event and preset rows; the app uses it to avoid overwriting server data from a new phone (see §3 First sign-in).
- Errors: `401 { "error": "Invalid Google token" }`.

**Dev bypass**
- Properties: `app.auth.skip-google-verification=true`, `app.auth.dev-user-email=dev@impulse.app` (in `application-dev.properties` only).
- When enabled, `/auth/google` ignores the token's contents and returns a token for the dev user (created if missing). The mobile dev button sends `{ "idToken": "dev" }` so the request still passes `@NotBlank`.
- Startup fails if the flag is true and the active profiles do not include `dev`, or if `dev-user-email` is blank.

**API JWT**
- HS256, secret from `app.jwt.secret` (env var in non-dev), issued with `NimbusJwtEncoder`, validated by the OAuth2 Resource Server with `NimbusJwtDecoder.withSecretKey`.
- Claims: `sub` = user id, `email`, `iat`, `exp` = 30 days. No refresh token.

**`PUT /me/snapshot`** (authenticated)
- Request body = the mobile backup format v1:
  ```json
  {
    "app": "impulse",
    "version": 1,
    "exportedAt": "2026-10-10T09:00:00.000Z",
    "events": [{ "id": 1, "title": "Push", "color": "#312e81", "start": "ISO", "end": "ISO", "locked": false }],
    "presets": [{ "id": 1, "title": "Push", "color": "#312e81", "locked": false, "pinned": true, "position": 1 }]
  }
  ```
- Validation (records + Bean Validation): `app == "impulse"`, `version == 1`, non-blank `title`/`color` on presets, non-null `title` (may be empty) and `color` on events, parseable `start`/`end`.
- Normalisation: `locked`, `pinned` null or missing → `false`; `position` null or missing → `0` (the mobile schema allows null `locked`, and `parseBackup` applies the same rules).
- In one transaction: delete the user's events and presets, insert the snapshot's rows (`id` → `local_id`), set `last_snapshot_at = now()`.
- Response `200`: `{ "events": number, "presets": number, "receivedAt": string }`
- Max request size 5 MB, enforced by a small servlet filter on `/me/snapshot` that rejects a missing `Content-Length` or one above 5 MB → `413` (RN `fetch` with a string body always sends `Content-Length`, so the app is never affected). (Spring's multipart/form limits don't apply to JSON bodies.)

**`GET /me/snapshot`** (authenticated)
- Response `200`: same format v1 built from the user's rows (`local_id` → `id`, `exportedAt` = now), events ordered by `local_id`, presets by `local_id`. An empty account returns empty arrays.

### Errors

One `@RestControllerAdvice`; all errors are `{ "error": string }`: `400` validation (message names the first bad field), `401` missing/invalid/expired JWT (via the resource server's entry point), `413` too large, `500` generic.

### Dev data

`DataSeeder` under `@Profile("dev")`: if the dev user has no events, insert ~3 months of Push/Pull/Legs/Rest events and the four default presets, and set `last_snapshot_at` so the app's first-sign-in hold can be exercised.

### Tests

- `@SpringBootTest` + Testcontainers Postgres:
  - `PUT` then `GET` round-trips a snapshot (equal after the normalisation rules above, ignoring `exportedAt`).
  - `PUT` replaces only the caller's rows; another user's rows are untouched.
  - Invalid snapshot → `400`; no/expired token → `401`.
  - Dev bypass returns the dev user under the `dev` profile; context fails to start with the flag on outside `dev`.
- Unit test of Google token validation: wrong `aud` and `email_verified=false` are rejected.

## 3. Mobile (`impulse/mobile`)

### New dependency

`@react-native-google-signin/google-signin` (+ config plugin). Configured with the **web** OAuth client ID as `webClientId` so the ID token's `aud` is accepted by the API. Requires a native rebuild.

### Config

`EXPO_PUBLIC_API_URL` in `.env` / EAS profile env (dev: the Mac's LAN IP, e.g. `http://192.168.1.20:8080`). `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` likewise. If `EXPO_PUBLIC_API_URL` is unset, the Account section is hidden and nothing else changes. The dev-user button depends on `EXPO_PUBLIC_APP_VARIANT === "development"`, which `npm run android` / `android:clean` already export; plain `npx expo start` against the dev client needs it in `.env` too.

### Modules

- `src/api/client.ts`: `apiFetch(path, init)` adds `Authorization: Bearer <token>`, JSON headers, base URL; throws `ApiError { status }` on non-2xx and `NetworkError` on fetch failure.
- `src/api/session.ts`: kv-store keys `sync.token`, `sync.user`; `getSession()`, `saveSession()`, `clearSession()`.
- `src/api/auth.ts`: `signInWithGoogle()` (native sign-in → `POST /auth/google` → `saveSession`), `signInAsDevUser()` (same endpoint, any token; only shown when `EXPO_PUBLIC_APP_VARIANT === "development"`), `signOut()` (Google sign-out + `clearSession`).
- `src/sync/upload.ts`:
  - One kv-store key `sync.state` (JSON): `pending`, `held` (see First sign-in), `lastUploadedAt`, `lastSyncedUserId` (account this phone last uploaded to or restored from), `serverSnapshot` (what the server had at a held sign-in), `signedOutByServer` (set by a 401, cleared on sign-in).
  - `markDataChanged()`: set pending; if signed in, schedule `uploadSnapshot()` after a 5 s debounce.
  - `uploadSnapshot()`: serialized through a promise queue (same pattern as `rescheduleDailyDigest`). Skips when signed out, held, or not pending. Builds the snapshot with `createBackup` from all rows, `PUT /me/snapshot`. Success → clear pending, store `lastUploadedAt`. `401` → `clearSession()`, keep pending. Network/5xx → keep pending. No retry loop.
  - `fetchServerSnapshot()`: `GET /me/snapshot` → `parseBackup` → `Backup`. Does not touch local data.
  - `markRestoredFromServer()`: clear pending and held, set `lastUploadedAt` to now. Called after a server restore so it doesn't bounce straight back up.
- `src/data/onDataChanged.ts`: `onDataChanged()` = `rescheduleDailyDigest()` + `markDataChanged()`.

### Where data changes are reported

Events (component call sites):
- `AddSheet`: add and undo → replace the existing `rescheduleDailyDigest()` with `onDataChanged()`.
- `EditEventModal`: delete → replace the existing call; lock toggle and colour change → **add** `onDataChanged()` (they don't reschedule today).

Presets (data layer): `createPreset`, `updatePreset`, `deletePreset`, `setPresetPinned` (when it returns true) and `movePinnedPreset` in `src/db/presets.ts` call `markDataChanged()` after writing. Presets don't affect notifications, so no reschedule.

Settings restore (`replaceWith` in `settings.tsx`) takes a source:
- `"file"` (file import): `restoreBackup` → `onDataChanged()` — the server should get the imported data.
- `"server"` (Restore from server): `restoreBackup` → `rescheduleDailyDigest()` + `markRestoredFromServer()`.

These stay as plain `rescheduleDailyDigest()`: app start and `AppState` "active" in `_layout.tsx`, and the notification-settings changes in `settings.tsx`. The first-run default-preset seed in `_layout.tsx` does **not** mark data as changed.

App start and `AppState` "active" also call `uploadSnapshot()` (no-op unless signed in, not held and pending).

### First sign-in (protecting the server copy)

A full-replace upload from a fresh phone would wipe the server. On sign-in, if the returned user id equals `lastSyncedUserId` and uploads aren't currently held, this is the same phone signing back in (e.g. expired token): uploads are not held and pending uploads go out. Otherwise, using the `snapshot` field of the auth response:
- `snapshot == null` (server empty): uploads are not held; set pending and upload immediately.
- `snapshot != null`: set `sync.uploadsHeld = true`. The Account section shows "This account has 1,509 workouts from 9 Oct" with two buttons: **Restore from server** (fetch → same "Replace all data?" alert → restore as `"server"`) and **Use this phone's data** (clear held, set pending, upload). Local edits while held keep the pending flag but never upload.

### Settings → Account section

- Signed out: "Sign in with Google" (+ "Continue as dev user" in dev builds).
- Signed in and held: the First sign-in choice above.
- Signed in: email, "Last uploaded <relative time>" or "Not uploaded yet", a pending indicator, **Upload now**, **Restore from server** (same "Replace all data?" alert as file import, with counts), **Sign out**.
- After a `401` (`signedOutByServer`) the section shows "Signed out — sign in again to upload". Any authenticated `401` clears the session centrally in `apiFetch`.

### Tests (Jest)

`src/sync/__tests__/upload.test.ts` with `apiFetch`, session and kv-store mocked and fake timers:
- signed out → no request, stays pending;
- success → one `PUT`, pending cleared, `lastUploadedAt` set;
- `401` → session cleared, still pending;
- network error → still pending;
- three `markDataChanged()` calls within 5 s → one upload;
- held → no request, stays pending;
- `markRestoredFromServer()` → not pending, not held, so no upload follows.

`src/api/__tests__/auth.test.ts`: sign-in with `snapshot: null` uploads immediately; with a snapshot it sets held and does not upload; the same user signing back in after a previous upload is not held.

### Manual check

Dev build, local API on the `dev` profile: sign in as dev user (seeded server data → held choice appears) → **Use this phone's data** → add a workout → row appears in Postgres within ~5 s → delete it locally → **Restore from server** brings it back and no upload follows.

## Out of scope

AI coach (next spec), two-way sync, subscriptions/paywall, account deletion, API deployment and production Google OAuth setup beyond client IDs.
