import { rescheduleDailyDigest } from "../notifications/dailyDigest";
import { markDataChanged } from "../sync/upload";

/** Call after any change to events or presets that should reach notifications and the server. */
export const onDataChanged = () => {
  rescheduleDailyDigest();
  markDataChanged();
};
