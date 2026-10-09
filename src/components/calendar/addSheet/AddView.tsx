import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import React, { ReactNode, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SelectPreset } from "../../../db/types";
import { otherPresets, pinnedPresets } from "../../../utils/presets";
import { P } from "../../P";
import { ColorSwatches, inputTextStyle } from "./ColorSwatches";
import { PresetTile } from "./PresetTile";

interface Props {
  presets: SelectPreset[];
  date: Date;
  onChangeDay: (delta: -1 | 1) => void;
  selectedPresetId: number | null;
  onSelectPreset: (id: number) => void;
  customTitle: string;
  onChangeCustomTitle: (title: string) => void;
  customColor: string;
  onChangeCustomColor: (color: string) => void;
  locked: boolean;
  onToggleLocked: () => void;
  addLabel: string | null;
  onAdd: () => void;
  onOpenAll: () => void;
  onOpenEdit: () => void;
}

// Lays tiles out two per row, padding the last row so tiles keep their width
const TileGrid = ({ children }: { children: ReactNode[] }) => {
  const rows: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 2) rows.push(children.slice(i, i + 2));

  return (
    <View className="gap-2">
      {rows.map((row, i) => (
        <View key={i} className="flex-row gap-2">
          {row}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
};

export const AddView = ({
  presets,
  date,
  onChangeDay,
  selectedPresetId,
  onSelectPreset,
  customTitle,
  onChangeCustomTitle,
  customColor,
  onChangeCustomColor,
  locked,
  onToggleLocked,
  addLabel,
  onAdd,
  onOpenAll,
  onOpenEdit,
}: Props) => {
  const [isPickingColor, setIsPickingColor] = useState(false);
  const pinned = pinnedPresets(presets);
  const others = otherPresets(presets);

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityLabel="Previous day"
          onPress={() => onChangeDay(-1)}
          className="items-center justify-center rounded-full size-11 bg-[#2c2c2b]"
        >
          <Ionicons name="chevron-back" size={20} color="#E5E5E7" />
        </Pressable>
        <View className="items-center flex-1">
          <P className="text-[13px] uppercase tracking-wider text-[#a1a1a6]">Add training</P>
          <P className="text-[22px]" fontFamily="Rubik-SemiBold">
            {format(date, "EEE d MMM")}
          </P>
        </View>
        <Pressable
          accessibilityLabel="Next day"
          onPress={() => onChangeDay(1)}
          className="items-center justify-center rounded-full size-11 bg-[#2c2c2b]"
        >
          <Ionicons name="chevron-forward" size={20} color="#E5E5E7" />
        </Pressable>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <P className="text-[15px] text-[#a1a1a6]" fontFamily="Rubik-Medium">
            Pick one
          </P>
          <Pressable
            onPress={onOpenEdit}
            className="items-center justify-center h-11 px-4 rounded-full bg-primary"
          >
            <P className="text-base text-white" fontFamily="Rubik-SemiBold">
              Edit
            </P>
          </Pressable>
        </View>

        <TileGrid>
          {[
            ...pinned.map(preset => (
              <PresetTile
                key={preset.id}
                title={preset.title}
                color={preset.color}
                selected={preset.id === selectedPresetId}
                dimmed={selectedPresetId !== null && preset.id !== selectedPresetId}
                onPress={() => onSelectPreset(preset.id)}
              />
            )),
            <View key="more" className="flex-1 rounded-[22px] p-[3px] border-2 border-transparent">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More presets, ${others.length} more`}
                onPress={onOpenAll}
                className="h-[72px] rounded-[18px] px-4 pt-3 pb-3 justify-between bg-[#2c2c2b]"
              >
                <View className="flex-row">
                  {others.slice(0, 4).map((preset, i) => (
                    <View
                      key={preset.id}
                      className="rounded-full size-3.5 border-2 border-[#2c2c2b]"
                      style={{ backgroundColor: preset.color, marginLeft: i === 0 ? 0 : -4 }}
                    />
                  ))}
                </View>
                <View className="flex-row items-baseline gap-1.5">
                  <P className="text-xl" fontFamily="Rubik-SemiBold">
                    More
                  </P>
                  {others.length > 0 && (
                    <P className="text-[15px] text-[#a1a1a6]">+{others.length}</P>
                  )}
                </View>
              </Pressable>
            </View>,
          ]}
        </TileGrid>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="flex-1 h-px bg-[#333332]" />
        <P className="text-sm text-[#8e8e93]">or</P>
        <View className="flex-1 h-px bg-[#333332]" />
      </View>

      <View className="gap-3">
        <View className="flex-row gap-2.5">
          <TextInput
            accessibilityLabel="Custom title"
            placeholder="Type your own…"
            placeholderTextColor="#8e8e93"
            cursorColor="#fff"
            value={customTitle}
            onChangeText={onChangeCustomTitle}
            className="flex-1 h-[52px] rounded-[14px] px-4 text-[17px] text-white bg-[#2c2c2b]"
            style={[inputTextStyle, { fontFamily: "Rubik-Regular" }]}
          />
          <Pressable
            accessibilityLabel="Custom colour"
            onPress={() => setIsPickingColor(open => !open)}
            className="items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-[#2c2c2b]"
          >
            <View className="rounded-full size-[26px]" style={{ backgroundColor: customColor }} />
          </Pressable>
        </View>
        {isPickingColor && (
          <ColorSwatches
            selected={customColor}
            onSelect={color => {
              onChangeCustomColor(color);
              setIsPickingColor(false);
            }}
          />
        )}
      </View>

      <View className="flex-row gap-2.5">
        <Pressable
          accessibilityLabel={locked ? "Unlock event" : "Lock event"}
          accessibilityState={{ selected: locked }}
          onPress={onToggleLocked}
          className="items-center justify-center w-14 h-14 rounded-2xl"
          style={{ backgroundColor: locked ? "#E5E5E7" : "#2c2c2b" }}
        >
          <Ionicons
            name={locked ? "lock-closed" : "lock-open"}
            size={22}
            color={locked ? "#151514" : "#E5E5E7"}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !addLabel }}
          disabled={!addLabel}
          onPress={onAdd}
          className="items-center justify-center flex-1 h-14 px-4 rounded-2xl"
          style={{ backgroundColor: addLabel ? "#0A84FF" : "#2c2c2b" }}
        >
          <P
            className="text-[17px]"
            fontFamily="Rubik-SemiBold"
            numberOfLines={1}
            style={{ color: addLabel ? "#FFFFFF" : "#8e8e93" }}
          >
            {addLabel ?? "Pick a training"}
          </P>
        </Pressable>
      </View>
    </View>
  );
};
