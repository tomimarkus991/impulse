import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SelectPreset } from "../../../db/types";
import { filterPresets, otherPresets, pinnedPresets } from "../../../utils/presets";
import { P } from "../../P";
import { inputTextStyle } from "./ColorSwatches";

interface Props {
  presets: SelectPreset[];
  date: Date;
  onBack: () => void;
  onSelect: (id: number) => void;
  onTogglePin: (preset: SelectPreset) => void;
  onCreate: (title: string) => void;
}

const SectionLabel = ({ children }: { children: string }) => (
  <P className="pt-4 pb-1.5 text-[13px] uppercase tracking-wider text-[#a1a1a6]">{children}</P>
);

const PresetRow = ({
  preset,
  onSelect,
  onTogglePin,
}: {
  preset: SelectPreset;
  onSelect: () => void;
  onTogglePin: () => void;
}) => (
  <View className="flex-row items-center h-[52px] border-b border-[#2f2f2e]">
    <Pressable onPress={onSelect} className="flex-row items-center flex-1 h-full gap-3.5">
      <View className="rounded-full size-3.5" style={{ backgroundColor: preset.color }} />
      <P className="text-[17px]" numberOfLines={1}>
        {preset.title}
      </P>
    </Pressable>
    <Pressable
      accessibilityLabel={`${preset.pinned ? "Unpin" : "Pin"} ${preset.title}`}
      onPress={onTogglePin}
      className="items-center justify-center size-11"
    >
      <Ionicons
        name={preset.pinned ? "pin" : "pin-outline"}
        size={20}
        color={preset.pinned ? "#0A84FF" : "#8e8e93"}
      />
    </Pressable>
  </View>
);

export const AllPresetsView = ({
  presets,
  date,
  onBack,
  onSelect,
  onTogglePin,
  onCreate,
}: Props) => {
  const [query, setQuery] = useState("");
  const { matches, exactMatch } = filterPresets(presets, query);
  const trimmed = query.trim();

  const row = (preset: SelectPreset) => (
    <PresetRow
      key={preset.id}
      preset={preset}
      onSelect={() => onSelect(preset.id)}
      onTogglePin={() => onTogglePin(preset)}
    />
  );

  return (
    <View className="flex-1 gap-4">
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel="Back"
          onPress={onBack}
          className="items-center justify-center rounded-full size-11 bg-[#2c2c2b]"
        >
          <Ionicons name="chevron-down" size={20} color="#E5E5E7" />
        </Pressable>
        <View className="items-center flex-1">
          <P className="text-[13px] text-[#a1a1a6]">{format(date, "EEE d MMM")}</P>
          <P className="text-lg" fontFamily="Rubik-SemiBold">
            All presets
          </P>
        </View>
        <View className="size-11" />
      </View>

      <View className="justify-center">
        <TextInput
          accessibilityLabel="Search presets"
          placeholder="Search or type a new one"
          placeholderTextColor="#8e8e93"
          cursorColor="#fff"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => trimmed && !exactMatch && onCreate(trimmed)}
          className="h-12 rounded-[14px] pl-[42px] pr-4 text-base text-white bg-[#2c2c2b]"
          style={[inputTextStyle, { fontFamily: "Rubik-Regular" }]}
        />
        <View className="absolute left-3.5" pointerEvents="none">
          <Ionicons name="search" size={18} color="#8e8e93" />
        </View>
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {trimmed && !exactMatch ? (
          <Pressable
            onPress={() => onCreate(trimmed)}
            className="flex-row items-center h-[52px] gap-3.5 border-b border-[#2f2f2e]"
          >
            <Ionicons name="add" size={20} color="#0A84FF" />
            <P className="text-[17px] text-primary" numberOfLines={1}>
              Create “{trimmed}”
            </P>
          </Pressable>
        ) : null}

        {trimmed ? (
          matches.map(row)
        ) : (
          <>
            <SectionLabel>Pinned · shown as tiles</SectionLabel>
            {pinnedPresets(presets).map(row)}
            {otherPresets(presets).length > 0 && <SectionLabel>Others</SectionLabel>}
            {otherPresets(presets).map(row)}
          </>
        )}
      </ScrollView>
    </View>
  );
};
