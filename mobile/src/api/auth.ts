import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";
import { getSyncState, ServerSnapshotInfo, setSyncState } from "../sync/syncState";
import { uploadSnapshot } from "../sync/upload";
import { apiFetch } from "./client";
import { clearSession, saveSession, SessionUser } from "./session";

export type AuthResponse = {
  token: string;
  user: SessionUser;
  snapshot: ServerSnapshotInfo | null;
};

export const isDevBuild = process.env.EXPO_PUBLIC_APP_VARIANT === "development";

/**
 * Stores the session and decides whether uploads may start. A phone that hasn't uploaded
 * with this account before must not overwrite server data, so it's held until the user chooses.
 */
export const completeSignIn = async ({ token, user, snapshot }: AuthResponse) => {
  const { lastSyncedUserId, held } = getSyncState();
  const sameAccountAsBefore = lastSyncedUserId === user.id && !held;

  saveSession({ token, user });
  setSyncState({ signedOutByServer: false });

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
  // Dev builds can still have signed in with Google, so always sign out there too
  await GoogleSignin.signOut().catch(() => {});
};
