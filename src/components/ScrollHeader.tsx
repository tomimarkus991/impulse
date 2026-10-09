import { Pressable, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { P } from "./P";

import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import { router } from "expo-router";
import { generateData } from "../db/generateData";

interface WeekDayProps {
  text: string;
}

const WeekDay = ({ text }: WeekDayProps) => {
  return <P className="flex-1 text-center">{text}</P>;
};

interface Props {
  month: Date;
}

export const DynamicHeader = ({ month }: Props) => {
  return (
    <View className="h-28 pt-7">
      <View className="flex-row justify-between mx-5 mb-3">
        <Animated.View
          key={format(month, "yyyy-MM")}
          entering={FadeIn.duration(200)}
          style={{ flex: 1 }}
        >
          <P className="text-2xl font-semibold">{format(month, "MMMM yy")}</P>
        </Animated.View>
        {/* Dev-only: fills the calendar with generated test events */}
        <View className="flex-row items-center gap-4">
          {__DEV__ && (
            <Pressable
              onPress={async () => {
                await generateData(1, 2025);
              }}
            >
              <AntDesign name="question-circle" size={24} color="white" />
            </Pressable>
          )}
          <Pressable
            accessibilityLabel="Settings"
            onPress={() => router.push("/settings")}
            hitSlop={10}
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </Pressable>
        </View>
      </View>
      <View className="flex-[7] flex-row mt-2">
        <WeekDay text="Mon" />
        <WeekDay text="Tue" />
        <WeekDay text="Wed" />
        <WeekDay text="Thu" />
        <WeekDay text="Fri" />
        <WeekDay text="Sat" />
        <WeekDay text="Sun" />
      </View>
    </View>
  );
};
