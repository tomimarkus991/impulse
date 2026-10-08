import { and, gte, lt } from "drizzle-orm";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { db } from "../../app/_layout";
import { eventsTable } from "../db/schema";
import { buildDigests, getDigestWindow } from "./digest";

const ANDROID_CHANNEL_ID = "daily-digest";
const DIGEST_DATA_TYPE = "daily-digest";

export const setupNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Daily summary",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const permissions = await Notifications.getPermissionsAsync();

  if (permissions.granted || !permissions.canAskAgain) {
    return permissions.granted;
  }

  return (await Notifications.requestPermissionsAsync()).granted;
};

const reschedule = async () => {
  const { granted } = await Notifications.getPermissionsAsync();

  if (!granted) return;

  const now = new Date();
  const { from, to } = getDigestWindow(now);

  const events = await db
    .select()
    .from(eventsTable)
    .where(
      and(gte(eventsTable.start, from.toISOString()), lt(eventsTable.start, to.toISOString()))
    );

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(request => request.content.data?.type === DIGEST_DATA_TYPE)
      .map(request => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );

  for (const digest of buildDigests(events, now)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today",
        body: digest.body,
        data: { type: DIGEST_DATA_TYPE },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: digest.date,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
};

// Chain calls so overlapping reschedules never interleave cancel/schedule passes
let queue = Promise.resolve();

export const rescheduleDailyDigest = () => {
  queue = queue.then(reschedule).catch(error => {
    console.warn("Failed to reschedule daily digest", error);
  });

  return queue;
};
