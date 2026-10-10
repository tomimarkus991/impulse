import { setDefaultOptions } from "date-fns";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SQLite from "expo-sqlite";
import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css";
import migrations from "../src/drizzle/migrations";
import { ModalProvider } from "../src/hooks/ModalContext";
import { presetsTable } from "../src/db/schema";
import { EventProvider } from "../src/hooks/EventContext";
import { SelectProvider } from "../src/hooks/SelectContext";
import { rescheduleDailyDigest, setupNotifications } from "../src/notifications/dailyDigest";
import { uploadSnapshot } from "../src/sync/upload";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const expo = SQLite.openDatabaseSync("db.db");

export const db = drizzle(expo);

export default function RootLayout() {
  const { success } = useMigrations(db, migrations);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!success) return;

    (async () => {
      const existing = await db.select().from(presetsTable).limit(1);

      if (existing.length === 0) {
        await db.insert(presetsTable).values([
          { id: 1, title: "Push", color: "#312E81", pinned: true, position: 1 },
          { id: 2, title: "Pull", color: "#BE6404", pinned: true, position: 2 },
          { id: 3, title: "Legs", color: "#1e3a8a", pinned: true, position: 3 },
          { id: 4, title: "Rest", color: "#14532D", pinned: true, position: 4 },
        ]);
      }
      setInitialized(true);
    })();
  }, [success]);

  const [loaded, error] = useFonts({
    "Rubik-Black": require("../assets/fonts/Rubik-Black.ttf"),
    "Rubik-BlackItalic": require("../assets/fonts/Rubik-BlackItalic.ttf"),
    "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
    "Rubik-BoldItalic": require("../assets/fonts/Rubik-BoldItalic.ttf"),
    "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
    "Rubik-ExtraBoldItalic": require("../assets/fonts/Rubik-ExtraBoldItalic.ttf"),
    "Rubik-Italic": require("../assets/fonts/Rubik-Italic.ttf"),
    "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
    "Rubik-LightItalic": require("../assets/fonts/Rubik-LightItalic.ttf"),
    "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
    "Rubik-MediumItalic": require("../assets/fonts/Rubik-MediumItalic.ttf"),
    "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
    "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),
    "Rubik-SemiBoldItalic": require("../assets/fonts/Rubik-SemiBoldItalic.ttf"),
  });

  setDefaultOptions({
    weekStartsOn: 1,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!initialized) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  useEffect(() => {
    (async () => {
      await setupNotifications();
      rescheduleDailyDigest();
      uploadSnapshot();
    })();

    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        rescheduleDailyDigest();
        uploadSnapshot();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <>
      <GestureHandlerRootView>
        <EventProvider>
          <ModalProvider>
            <SelectProvider>
              <Stack>
                <Stack.Screen name="(tabs)/index" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
              </Stack>
            </SelectProvider>
          </ModalProvider>
        </EventProvider>
      </GestureHandlerRootView>
    </>
  );
}
