import Ionicons from "@expo/vector-icons/Ionicons";
import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { P } from "../../P";

export const textColorOn = (color: string) =>
  color.toLowerCase() === "#eab308" ? "#121212" : "#FFFFFF";

interface Props {
  title: string;
  color: string;
  selected?: boolean;
  dimmed?: boolean;
  onPress: () => void;
  // Optional corner control, e.g. an unpin button in edit mode
  corner?: ReactNode;
}

export const PresetTile = ({ title, color, selected, dimmed, onPress, corner }: Props) => {
  const textColor = textColorOn(color);

  return (
    // Outer ring keeps the layout stable whether or not the tile is selected
    <View
      className="flex-1 rounded-[22px] p-[3px] border-2"
      style={{ borderColor: selected ? "#FFFFFF" : "transparent" }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        className="h-[72px] rounded-[18px] px-4 pb-3 justify-end"
        style={{ backgroundColor: color, opacity: dimmed ? 0.55 : 1 }}
      >
        <P
          className="text-xl"
          fontFamily="Rubik-SemiBold"
          numberOfLines={1}
          style={{ color: textColor }}
        >
          {title}
        </P>
        {selected && !corner && (
          <View className="absolute items-center justify-center bg-white rounded-full top-2.5 right-2.5 size-[26px]">
            <Ionicons name="checkmark" size={16} color={color} />
          </View>
        )}
        {corner && <View className="absolute top-1.5 right-1.5">{corner}</View>}
      </Pressable>
    </View>
  );
};
