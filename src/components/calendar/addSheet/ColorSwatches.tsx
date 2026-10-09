import { Pressable, View } from "react-native";
import { colors } from "../../../config";

interface Props {
  selected: string;
  onSelect: (color: string) => void;
  size?: number;
}

export const ColorSwatches = ({ selected, onSelect, size = 28 }: Props) => {
  return (
    <View className="flex-row justify-between">
      {Object.entries(colors.events).map(([name, color]) => {
        const isSelected = color.toLowerCase() === selected.toLowerCase();

        return (
          <Pressable
            key={color}
            accessibilityLabel={name}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(color)}
            hitSlop={6}
            style={{
              width: size + 8,
              height: size + 8,
              borderRadius: (size + 8) / 2,
              borderWidth: 2,
              borderColor: isSelected ? "#FFFFFF" : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
            />
          </Pressable>
        );
      })}
    </View>
  );
};
