# Daily Notifications Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify the user at 10:00 local time with the titles of that day's events. Days with no events get no notification.

**Architecture:** Pure scheduling logic lives in `src/notifications/digest.ts` and is unit-tested. `src/notifications/dailyDigest.ts` wraps it with expo-notifications and the DB. It cancels and re-schedules a rolling 30-day set of DATE-triggered local notifications. Rescheduling runs on app start, on app foreground, and (debounced) on every `setEvents` call.

**Tech Stack:** Expo SDK 57, expo-notifications, drizzle-orm/expo-sqlite, date-fns, jest-expo.

Spec: `docs/superpowers/specs/2026-10-08-daily-notifications-design.md`

---

### Task 1: Dependency and config plugin

**Files:** Modify `package.json` and `app.config.ts`

- [ ] Run `npx expo install expo-notifications`.
- [ ] Add `"expo-notifications"` to `plugins` in `app.config.ts`, after `"expo-sqlite"`.
- [ ] Run `npx expo-doctor`. Expected: all checks pass.
- [ ] Commit: `feat: Add expo-notifications dependency and plugin`

### Task 2: Pure digest logic (TDD)

**Files:**
- Create `src/notifications/digest.ts`
- Test `src/notifications/__tests__/digest.test.ts`

- [ ] Write failing tests for `getDigestWindow` and `buildDigests`. Cover:
  - grouping by local day;
  - ordering by start time;
  - the `"Event"` fallback for empty titles;
  - skipping today when it is already past 10:00;
  - including today when it is before 10:00;
  - no entry for empty days;
  - excluding events outside the window;
  - a 10:00 local trigger on a DST transition day.
- [ ] Run `npx jest src/notifications`. Expected: FAIL, because the module is missing.
- [ ] Implement `digest.ts`:
  - Constants: `DIGEST_HOUR = 10`, `DIGEST_MINUTE = 0`, `DIGEST_WINDOW_DAYS = 30`.
  - `getDigestWindow(now)`
  - `buildDigests(events, now)` per the spec. Use date-fns `addDays`, `startOfDay` and `set` (DST-safe) and the `dd-MM-yyyy` day key.
  - Use only `import type` from `../db/types`.
- [ ] Run `npx jest src/notifications`. Expected: PASS.
- [ ] Commit: `feat: Add daily digest scheduling logic`

### Task 3: Notification side effects

**Files:** Create `src/notifications/dailyDigest.ts`

- [ ] Implement `setupNotifications()`:
  - calls `setNotificationHandler` with `shouldShowBanner`, `shouldShowList` and `shouldPlaySound` set to `true` and `shouldSetBadge: false`;
  - on Android, creates the channel `daily-digest`;
  - gets permission, requesting it if `canAskAgain`;
  - returns whether permission is granted.
- [ ] Implement `rescheduleDailyDigest()`, serialized through a module-level promise chain:
  - checks permission and returns if it is not granted;
  - queries events with `gte(start, from)` and `lt(start, to)`;
  - cancels scheduled notifications whose `data.type === "daily-digest"`;
  - schedules each digest with `SchedulableTriggerInputTypes.DATE`, title `"Today"`, its body, `data` and `channelId`;
  - catches errors and passes them to `console.warn`.
- [ ] Run `npx tsc --noEmit`. Expected: no errors.
- [ ] Commit: `feat: Schedule daily digest notifications`

### Task 4: Wire triggers

**Files:** Modify `app/_layout.tsx` and `src/hooks/EventContext.tsx`

- [ ] In `RootLayoutNav`, add a mount effect: `await setupNotifications()`, then `rescheduleDailyDigest()`. Add an `AppState` `"change"` listener that reschedules on `"active"` and remove it on unmount.
- [ ] In `EventProvider`, add a `useEffect` on `events` that sets a 1000ms timeout calling `rescheduleDailyDigest()` and clears it on cleanup.
- [ ] Run `npx tsc --noEmit`, `npx jest`, `npx expo-doctor` and `npx expo export --platform android`. Expected: all succeed.
- [ ] Commit: `feat: Reschedule daily digest on start, foreground and event changes`

### Task 5: Manual verification (user, on device)

- [ ] Rebuild the dev client (native module added).
- [ ] Temporarily set `DIGEST_HOUR`/`DIGEST_MINUTE` to one minute ahead. Create an event today, background the app, and confirm the notification arrives. Then revert the constants.
