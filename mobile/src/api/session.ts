import { Storage } from "expo-sqlite/kv-store";

import { notifySyncListeners } from "../sync/syncState";

export type SessionUser = { id: number; email: string; name: string | null };
export type Session = { token: string; user: SessionUser };

const TOKEN = "sync.token";
const USER = "sync.user";

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
  notifySyncListeners();
};

/** Signs out locally. */
export const clearSession = () => {
  Storage.removeItemSync(TOKEN);
  Storage.removeItemSync(USER);
  notifySyncListeners();
};
