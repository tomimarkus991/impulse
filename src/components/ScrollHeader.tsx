import { Animated, Pressable, Text, View } from "react-native";
import { P } from "./P";

import AntDesign from "@expo/vector-icons/AntDesign";
import { format } from "date-fns";
import { db } from "../../app/_layout";
import { eventsTable } from "../db/schema";
import { generateData } from "../db/generateData";
import { MotiView } from "moti";
import { ANIMATION_DURATIONS } from "../config";

interface WeekDayProps {
  text: string;
}

const WeekDay = ({ text }: WeekDayProps) => {
  return <P className="flex-1 text-center">{text}</P>;
};

interface Props {
  month: Date;
  translateX: Animated.Value;
  opacity: Animated.Value;
}

export const DynamicHeader = ({ month, translateX, opacity }: Props) => {
  return (
    <View className="h-28 pt-7">
      <View className="flex-row justify-between mx-5 mb-3">
        <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
          <P className="text-2xl font-semibold">{format(month, "MMMM yy")}</P>
        </Animated.View>
        <Pressable
          onPress={async () => {
            console.log("Generating data");

            // await db.delete(eventsTable).all();
            await generateData(1, 2025);
          }}
        >
          <AntDesign name="question-circle" size={24} color="white" />
        </Pressable>
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
