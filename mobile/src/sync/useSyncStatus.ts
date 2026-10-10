import { useSyncExternalStore } from "react";
import { getSession } from "../api/session";
import { getSyncState, subscribeSyncState } from "./syncState";

/** Sync state plus the current session; re-renders on any change to either. */
export const useSyncStatus = () => {
  const state = useSyncExternalStore(subscribeSyncState, getSyncState);
  return { ...state, session: getSession() };
};
