# Daily Event Notifications — Design

Date: 2026-10-08

## Goal

At 10:00 local time each day, notify the user of the events on that day. No notification on days without events.

## Constraints

- Events live only in on-device SQLite (`eventsTable`, drizzle). No backend.
- Local notification content is fixed at schedule time, so notifications must be pre-built from the DB and rebuilt when events change.
- iOS allows at most 64 pending local notifications.
- Event `start` is a UTC ISO string; the calendar assigns an event to a day via `format(event.start, "dd-MM-yyyy")` (local time). Notifications use the same rule.
- Preset titles can be empty strings.

## Approach

Pre-schedule one date-triggered local notification per upcoming day that has events, covering a rolling 30-day window. Cancel and rebuild the full set whenever events change and on app start.

Rejected: daily background task (OS controls timing, unreliable); server push (requires backend + sync).

Known limitations:
- If the app is not opened for more than 30 days, notifications stop until it is opened again.
- After a timezone change, the notification times are stale until the app is next foregrounded.

## Components

### Dependency / config

- `npx expo install expo-notifications`
- Add `"expo-notifications"` to `plugins` in `app.config.ts`.
- Requires a new dev-client / native build.

### `src/notifications/digest.ts` (pure, no db/expo imports)

Constants:
- `DIGEST_HOUR = 10`, `DIGEST_MINUTE = 0`
- `DIGEST_WINDOW_DAYS = 30`

Functions (unit-tested):
- `getDigestWindow(now: Date): { from: Date; to: Date }`: `from = startOfDay(now)`, `to = addDays(from, DIGEST_WINDOW_DAYS)`.
- `buildDigests(events: SelectEvent[], now: Date): { date: Date; body: string }[]`
  - Groups events by local day (`dd-MM-yyyy` of `start`), the same rule as `useGetCurrentMonth.tsx` / `CalendarWeek.tsx`.
  - For each day offset `i` in `[0, DIGEST_WINDOW_DAYS)`, the day is `addDays(startOfDay(now), i)` and the trigger is `setMinutes(setHours(day, DIGEST_HOUR), DIGEST_MINUTE)` with seconds and ms zeroed. Never use `+ i * 86400000` (DST-safe).
  - Only days with ≥1 event produce an entry. Triggers `<= now` are skipped.
  - Body: event titles in `start` order, joined with `", "`. Empty titles render as `"Event"`.

### `src/notifications/dailyDigest.ts` (side effects)

- `ANDROID_CHANNEL_ID = "daily-digest"`, `DIGEST_DATA_TYPE = "daily-digest"`.
- `setupNotifications(): Promise<boolean>`:
  - Calls `setNotificationHandler` with `shouldShowBanner`, `shouldShowList` and `shouldPlaySound` set to `true` and `shouldSetBadge: false`.
  - On Android, creates the channel via `setNotificationChannelAsync`.
  - Calls `getPermissionsAsync`, then `requestPermissionsAsync` if the user can still be asked. Returns whether permission is granted.
- `rescheduleDailyDigest(): Promise<void>`:
  - Checks permission itself via `getPermissionsAsync` and returns if it is not granted.
  - Otherwise:
    - gets `getDigestWindow(new Date())`;
    - queries events with `gte(start, from.toISOString())` and `lt(start, to.toISOString())` (it filters on `start` only);
    - cancels every scheduled notification (`getAllScheduledNotificationsAsync`) whose `content.data.type === DIGEST_DATA_TYPE`;
    - schedules each `buildDigests` entry with a `SchedulableTriggerInputTypes.DATE` trigger, title `"Today"`, `data: { type: DIGEST_DATA_TYPE }` and the Android `channelId`.
  - Calls are serialized through a module-level promise chain, so cancel/schedule passes never interleave.
  - Errors are caught and passed to `console.warn`.
- Uses `db` from `app/_layout.tsx` (the existing pattern). This is why the pure logic lives in `digest.ts`.

### Triggering

- **App start (authoritative):** in `app/_layout.tsx`, after initialization, call `await setupNotifications()` and then `rescheduleDailyDigest()`.
- **App foreground:** an `AppState` listener (in `RootLayoutNav`) calls `rescheduleDailyDigest()` when the state becomes `"active"`. This handles timezone changes and keeps the 30-day window rolling.
- **Event changes:** create (both paths in `CreateEventModal.tsx`) and delete (`EditEventModal.tsx`) call `rescheduleDailyDigest()` right after their DB write. Lock and color changes don't affect notification content.

## Error handling

- Permission denied → no-op, no UI.
- Scheduling and DB errors → `console.warn`. They are never thrown into the UI.
- Android 12+ without `SCHEDULE_EXACT_ALARM` may deliver a few minutes late (inexact alarms). This is accepted for a daily digest, and no extra permission is added.

## Testing

- Jest unit tests for `digest.ts` (`buildDigests`, `getDigestWindow`): grouping by local day, start-time ordering, empty-title fallback, past-trigger skip (today after 10:00), empty days produce nothing, window boundary, DST transition day.
- Manual: on a dev build, temporarily set `DIGEST_HOUR/MINUTE` to a minute ahead, create an event today, background the app, confirm the notification.
