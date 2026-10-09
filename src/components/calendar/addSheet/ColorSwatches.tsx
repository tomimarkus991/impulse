import { Pressable, TextStyle, View } from "react-native";
import { colors } from "../../../config";

// Android adds font padding that pushes TextInput text off-centre and clips it
export const inputTextStyle: TextStyle = {
  textAlignVertical: "center",
  includeFontPadding: false,
  paddingVertical: 0,
};

const PER_ROW = 5;

interface Props {
  selected: string;
  onSelect: (color: string) => void;
  size?: number;
}

export const ColorSwatches = ({ selected, onSelect, size = 32 }: Props) => {
  const swatches = Object.entries(colors.events);
  const rows = [swatches.slice(0, PER_ROW), swatches.slice(PER_ROW)];

  return (
    <View className="gap-3">
      {rows.map((row, i) => (
        <View key={i} className="flex-row justify-between">
          {row.map(([name, color]) => {
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
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};
