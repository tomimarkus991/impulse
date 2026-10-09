import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, set } from "date-fns";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackupError } from "../src/backup/backup";
import {
  pickBackup,
  restoreBackup,
  saveBackupToFolder,
  shareBackup,
} from "../src/backup/fileBackup";
import { P } from "../src/components/P";
import { loadPresets } from "../src/db/presets";
import { useEvent } from "../src/hooks/EventContext";
import {
  rescheduleDailyDigest,
  sendTestNotification,
  setupNotifications,
} from "../src/notifications/dailyDigest";
import {
  getNotificationSettings,
  NotificationSettings,
  saveNotificationSettings,
} from "../src/settings/notificationSettings";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View className="gap-2">
    <P className="px-1 text-[13px] uppercase tracking-wider text-[#a1a1a6]">{title}</P>
    <View className="overflow-hidden rounded-[18px] bg-[#2c2c2b]">{children}</View>
  </View>
);

const Row = ({
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  busy,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
  right?: ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || busy || !onPress}
    className="flex-row items-center gap-3.5 px-4 min-h-[60px] py-3 active:bg-[#353534]"
    style={{ opacity: disabled ? 0.4 : 1 }}
  >
    <Ionicons name={icon} size={22} color="#E5E5E7" />
    <View className="flex-1 gap-0.5">
      <P className="text-[17px]">{title}</P>
      {subtitle && <P className="text-sm text-[#a1a1a6]">{subtitle}</P>}
    </View>
    {busy ? <ActivityIndicator color="#E5E5E7" /> : right}
  </Pressable>
);

const Divider = () => <View className="h-px ml-[54px] bg-[#3a3a39]" />;

export default function SettingsScreen() {
  const { setPresets, reloadEvents } = useEvent();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [isPickingTime, setIsPickingTime] = useState(false);
  const [busy, setBusy] = useState<"save" | "share" | "import" | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ granted, canAskAgain }) =>
      setPermissionBlocked(!granted && !canAskAgain)
    );
  }, []);

  const updateSettings = (changes: Partial<NotificationSettings>) => {
    const next = { ...settings, ...changes };
    setSettings(next);
    saveNotificationSettings(next);
    rescheduleDailyDigest();
  };

  const toggleEnabled = async (enabled: boolean) => {
    updateSettings({ enabled });
    if (!enabled) return;

    const granted = await setupNotifications();
    setPermissionBlocked(!granted);
    if (granted) rescheduleDailyDigest();
  };

  const time = set(new Date(), { hours: settings.hour, minutes: settings.minute });

  const onSave = async () => {
    setBusy("save");
    try {
      const saved = await saveBackupToFolder();
      if (saved) {
        Alert.alert(
          "Backup saved",
          `${saved.name}\n\n${saved.events} trainings and ${saved.presets} presets.`
        );
      }
    } catch (error) {
      Alert.alert("Saving failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy("share");
    try {
      await shareBackup();
    } catch (error) {
      Alert.alert("Sharing failed", String(error));
    } finally {
      setBusy(null);
    }
  };

  const replaceWith = async (backup: NonNullable<Awaited<ReturnType<typeof pickBackup>>>) => {
    setBusy("import");
    try {
      restoreBackup(backup);
      setPresets(await loadPresets());
      reloadEvents();
      rescheduleDailyDigest();
      Alert.alert(
        "Backup imported",
        `${backup.events.length} trainings and ${backup.presets.length} presets restored.`
      );
    } catch (error) {
      Alert.alert("Import failed", `Nothing was changed.\n\n${String(error)}`);
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    let backup;
    try {
      backup = await pickBackup();
    } catch (error) {
      Alert.alert(
        "Can't import this file",
        error instanceof BackupError ? error.message : String(error)
      );
      return;
    }
    if (!backup) return;

    const exported = backup.exportedAt ? ` from ${format(backup.exportedAt, "d MMM yyyy")}` : "";

    Alert.alert(
      "Replace all data?",
      `This backup${exported} has ${backup.events.length} trainings and ${backup.presets.length} presets. Everything currently in the app will be replaced.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Replace", style: "destructive", onPress: () => replaceWith(backup) },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <Pressable
          accessibilityLabel="Back"
          onPress={() => router.back()}
          className="items-center justify-center rounded-full size-11 bg-[#2c2c2b]"
        >
          <Ionicons name="chevron-back" size={20} color="#E5E5E7" />
        </Pressable>
        <P className="flex-1 text-xl text-center" fontFamily="Rubik-SemiBold">
          Settings
        </P>
        <View className="size-11" />
      </View>

      <ScrollView contentContainerClassName="gap-7 px-5 pt-4 pb-10">
        <Section title="Notifications">
          <Row
            icon="notifications-outline"
            title="Daily summary"
            subtitle="Lists the day's trainings"
            right={
              <Switch
                value={settings.enabled}
                onValueChange={toggleEnabled}
                trackColor={{ true: "#0A84FF", false: "#48484a" }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <Divider />
          <Row
            icon="time-outline"
            title="Time"
            disabled={!settings.enabled}
            onPress={() => setIsPickingTime(open => !open)}
            right={
              <P className="text-[17px] text-primary" fontFamily="Rubik-Medium">
                {format(time, "HH:mm")}
              </P>
            }
          />
          <Divider />
          <Row
            icon="paper-plane-outline"
            title="Send a test"
            subtitle="Arrives in a few seconds"
            disabled={!settings.enabled}
            onPress={() => sendTestNotification()}
          />
        </Section>

        {isPickingTime && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            themeVariant="dark"
            onChange={(event, date) => {
              if (Platform.OS === "android") setIsPickingTime(false);
              if (event.type === "set" && date) {
                updateSettings({ hour: date.getHours(), minute: date.getMinutes() });
              }
            }}
          />
        )}

        {permissionBlocked && settings.enabled && (
          <Pressable
            onPress={() => Linking.openSettings()}
            className="flex-row items-center gap-3 p-4 rounded-[18px] bg-[#3a2a12]"
          >
            <Ionicons name="warning-outline" size={20} color="#eab308" />
            <P className="flex-1 text-[15px]">
              Notifications are turned off for Impulse. Tap to open system settings.
            </P>
          </Pressable>
        )}

        <Section title="Data">
          {Platform.OS === "android" && (
            <>
              <Row
                icon="save-outline"
                title="Save backup"
                subtitle="Pick a folder on your phone"
                busy={busy === "save"}
                disabled={busy !== null && busy !== "save"}
                onPress={onSave}
              />
              <Divider />
            </>
          )}
          <Row
            icon="share-outline"
            title="Share backup"
            subtitle="Send it to Drive, email or another app"
            busy={busy === "share"}
            disabled={busy !== null && busy !== "share"}
            onPress={onShare}
          />
          <Divider />
          <Row
            icon="download-outline"
            title="Import backup"
            subtitle="Replace everything with a backup file"
            busy={busy === "import"}
            disabled={busy !== null && busy !== "import"}
            onPress={onImport}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
