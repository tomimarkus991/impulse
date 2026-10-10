import { Storage } from "expo-sqlite/kv-store";
import { DIGEST_HOUR, DIGEST_MINUTE, DigestTime } from "../notifications/digest";

export type NotificationSettings = DigestTime & {
  enabled: boolean;
};

const KEY = "settings.notifications";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  hour: DIGEST_HOUR,
  minute: DIGEST_MINUTE,
};

export const getNotificationSettings = (): NotificationSettings => {
  try {
    const stored = Storage.getItemSync(KEY);
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const saveNotificationSettings = (settings: NotificationSettings) =>
  Storage.setItemSync(KEY, JSON.stringify(settings));
