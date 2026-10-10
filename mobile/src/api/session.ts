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
