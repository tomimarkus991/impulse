import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SelectEvent } from "../../../db/types";
import { P } from "../../P";
import { textColorOn } from "./PresetTile";

const VISIBLE_MS = 4000;

interface Props {
  event: SelectEvent;
  onUndo: () => void;
  onDismiss: () => void;
}

export const AddedToast = ({ event, onUndo, onDismiss }: Props) => {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timeout = setTimeout(onDismiss, VISIBLE_MS);

    return () => clearTimeout(timeout);
  }, [event.id]);

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      accessibilityLiveRegion="polite"
      className="absolute flex-row items-center gap-3 py-2.5 pl-4 pr-2.5 left-4 right-4 rounded-[18px] bg-[#2c2c2b]"
      style={{ bottom: insets.bottom + 24, elevation: 8 }}
    >
      <View
        className="items-center justify-center rounded-full size-8"
        style={{ backgroundColor: event.color }}
      >
        <Ionicons name="checkmark" size={18} color={textColorOn(event.color)} />
      </View>
      <View className="flex-1">
        <P className="text-base" fontFamily="Rubik-Medium" numberOfLines={1}>
          {event.title} added
        </P>
        <P className="text-[13px] text-[#a1a1a6]">{format(event.start, "EEE d MMM")}</P>
      </View>
      <Pressable onPress={onUndo} className="justify-center h-11 px-3.5">
        <P className="text-base text-primary" fontFamily="Rubik-SemiBold">
          Undo
        </P>
      </Pressable>
    </Animated.View>
  );
};
