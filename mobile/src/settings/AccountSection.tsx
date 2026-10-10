import { formatDistanceToNow, format } from "date-fns";
import React, { useState } from "react";
import { Alert } from "react-native";
import { getApiUrl, NetworkError } from "../api/client";
import { isDevBuild, signInAsDevUser, signInWithGoogle, signOut } from "../api/auth";
import { Backup } from "../backup/backup";
import { setSyncState } from "../sync/syncState";
import {
  cancelScheduledUpload,
  fetchServerSnapshot,
  UploadResult,
  uploadSnapshot,
} from "../sync/upload";
import { useSyncStatus } from "../sync/useSyncStatus";
import { Divider, Row, Section } from "./SettingsRows";

interface Props {
  /** Shows the "Replace all data?" confirm and restores; source decides upload behaviour */
  onRestore: (backup: Backup, source: "server") => void;
}

export const AccountSection = ({ onRestore }: Props) => {
  const { session, pending, held, lastUploadedAt, serverSnapshot, signedOutByServer } =
    useSyncStatus();
  const [busy, setBusy] = useState<"signin" | "upload" | "restore" | null>(null);

  if (!getApiUrl()) return null;

  const run = async (kind: typeof busy, action: () => Promise<unknown>) => {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      const message =
        error instanceof NetworkError
          ? "Couldn't reach the server."
          : error instanceof Error
            ? error.message
            : String(error);
      Alert.alert("Something went wrong", message);
    } finally {
      setBusy(null);
    }
  };

  const restore = () =>
    run("restore", async () => {
      // A debounced upload firing mid-restore would overwrite the copy we're about to fetch
      cancelScheduledUpload();
      onRestore(await fetchServerSnapshot(), "server");
    });

  /** Manual uploads tell the user when they didn't go through; background ones stay quiet. */
  const reportUpload = (result: UploadResult) => {
    if (result === "failed") {
      Alert.alert(
        "Upload failed",
        "Couldn't reach the server. Your changes are kept and will upload later."
      );
    } else if (result === "unauthorized") {
      Alert.alert("Signed out", "Sign in again to upload.");
    }
  };

  if (!session) {
    return (
      <Section title="Account">
        <Row
          icon="logo-google"
          title="Sign in with Google"
          subtitle={
            signedOutByServer
              ? "Signed out — sign in again to upload"
              : "Back up your trainings to your account"
          }
          busy={busy === "signin"}
          onPress={() => run("signin", signInWithGoogle)}
        />
        {isDevBuild && (
          <>
            <Divider />
            <Row
              icon="construct-outline"
              title="Continue as dev user"
              disabled={busy === "signin"}
              onPress={() => run("signin", signInAsDevUser)}
            />
          </>
        )}
      </Section>
    );
  }

  if (held) {
    const summary = serverSnapshot
      ? `This account has ${serverSnapshot.events} trainings from ${format(serverSnapshot.receivedAt, "d MMM")}.`
      : "This account already has data.";

    return (
      <Section title="Account">
        <Row icon="cloud-outline" title={session.user.email} subtitle={summary} />
        <Divider />
        <Row
          icon="cloud-download-outline"
          title="Restore from server"
          subtitle="Replace this phone's data"
          busy={busy === "restore"}
          onPress={restore}
        />
        <Divider />
        <Row
          icon="phone-portrait-outline"
          title="Use this phone's data"
          subtitle="Replace the server copy"
          busy={busy === "upload"}
          onPress={() =>
            run("upload", async () => {
              setSyncState({ held: false, pending: true, serverSnapshot: null });
              reportUpload(await uploadSnapshot());
            })
          }
        />
      </Section>
    );
  }

  const uploadedText = lastUploadedAt
    ? `Last uploaded ${formatDistanceToNow(lastUploadedAt, { addSuffix: true })}`
    : "Not uploaded yet";

  return (
    <Section title="Account">
      <Row
        icon="cloud-done-outline"
        title={session.user.email}
        subtitle={pending ? `${uploadedText} · changes waiting` : uploadedText}
      />
      <Divider />
      <Row
        icon="cloud-upload-outline"
        title="Upload now"
        busy={busy === "upload"}
        onPress={() =>
          run("upload", async () => {
            setSyncState({ pending: true });
            reportUpload(await uploadSnapshot());
          })
        }
      />
      <Divider />
      <Row
        icon="cloud-download-outline"
        title="Restore from server"
        busy={busy === "restore"}
        onPress={restore}
      />
      <Divider />
      <Row icon="log-out-outline" title="Sign out" onPress={() => run(null, signOut)} />
    </Section>
  );
};
