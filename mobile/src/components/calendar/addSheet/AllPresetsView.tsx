import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import React, { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { colors } from "../../../config";
import { SelectPreset } from "../../../db/types";
import { filterPresets, otherPresets, pinnedPresets } from "../../../utils/presets";
import { P } from "../../P";
import { ColorSwatches, inputTextStyle } from "./ColorSwatches";
import { textColorOn } from "./PresetTile";

interface Props {
  presets: SelectPreset[];
  date: Date;
  startCreating?: boolean;
  onBack: () => void;
  onSelect: (id: number) => void;
  onTogglePin: (preset: SelectPreset) => void;
  onDelete: (preset: SelectPreset) => void;
  onCreate: (title: string, color: string) => void;
}

const SectionLabel = ({ children }: { children: string }) => (
  <P className="pt-4 pb-1.5 text-[13px] uppercase tracking-wider text-[#a1a1a6]">{children}</P>
);

const PresetRow = ({
  preset,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  preset: SelectPreset;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) => (
  <View className="flex-row items-center h-[52px] border-b border-[#2f2f2e]">
    <Pressable onPress={onSelect} className="flex-row items-center flex-1 h-full gap-3.5">
      <View className="rounded-full size-3.5" style={{ backgroundColor: preset.color }} />
      <P className="flex-1 text-[17px]" numberOfLines={1}>
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
    <Pressable
      accessibilityLabel={`Delete ${preset.title}`}
      onPress={onDelete}
      className="items-center justify-center size-11"
    >
      <Ionicons name="trash-outline" size={20} color="#ff6961" />
    </Pressable>
  </View>
);

const NewPresetForm = ({
  initialTitle,
  onCancel,
  onCreate,
}: {
  initialTitle: string;
  onCancel: () => void;
  onCreate: (title: string, color: string) => void;
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [color, setColor] = useState(colors.events.kollane);
  const trimmed = title.trim();

  return (
    <View className="gap-4 p-4 rounded-[18px] bg-[#2c2c2b]">
      <View className="flex-row items-center justify-between">
        <P className="text-lg" fontFamily="Rubik-SemiBold">
          New preset
        </P>
        <Pressable onPress={onCancel} hitSlop={8}>
          <P className="text-base text-[#a1a1a6]">Cancel</P>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="New preset name"
        placeholder="Name, e.g. Upper body"
        placeholderTextColor="#8e8e93"
        cursorColor="#fff"
        autoFocus
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={() => trimmed && onCreate(trimmed, color)}
        className="h-[52px] px-4 rounded-[14px] text-lg text-white bg-[#222221]"
        style={[inputTextStyle, { fontFamily: "Rubik-Regular" }]}
      />
      <ColorSwatches selected={color} onSelect={setColor} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !trimmed }}
        disabled={!trimmed}
        onPress={() => onCreate(trimmed, color)}
        className="items-center justify-center h-[52px] rounded-[14px]"
        style={{ backgroundColor: trimmed ? color : "#3a3a39" }}
      >
        <P
          className="text-[17px]"
          fontFamily="Rubik-SemiBold"
          style={{ color: trimmed ? textColorOn(color) : "#8e8e93" }}
        >
          {trimmed ? `Create ${trimmed}` : "Type a name"}
        </P>
      </Pressable>
    </View>
  );
};

export const AllPresetsView = ({
  presets,
  date,
  startCreating = false,
  onBack,
  onSelect,
  onTogglePin,
  onDelete,
  onCreate,
}: Props) => {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(startCreating);
  const { matches, exactMatch } = filterPresets(presets, query);
  const trimmed = query.trim();

  const row = (preset: SelectPreset) => (
    <PresetRow
      key={preset.id}
      preset={preset}
      onSelect={() => onSelect(preset.id)}
      onTogglePin={() => onTogglePin(preset)}
      onDelete={() => onDelete(preset)}
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
        <Pressable
          accessibilityLabel="New preset"
          onPress={() => setIsCreating(true)}
          className="flex-row items-center gap-1 px-3.5 rounded-full h-11 bg-primary"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <P className="text-base text-white" fontFamily="Rubik-SemiBold">
            New
          </P>
        </Pressable>
      </View>

      {isCreating ? (
        <NewPresetForm
          initialTitle={trimmed}
          onCancel={() => setIsCreating(false)}
          onCreate={onCreate}
        />
      ) : (
        <View className="justify-center">
          <TextInput
            accessibilityLabel="Search presets"
            placeholder="Search presets"
            placeholderTextColor="#8e8e93"
            cursorColor="#fff"
            value={query}
            onChangeText={setQuery}
            className="h-12 rounded-[14px] pl-[42px] pr-4 text-base text-white bg-[#2c2c2b]"
            style={[inputTextStyle, { fontFamily: "Rubik-Regular" }]}
          />
          <View className="absolute left-3.5" pointerEvents="none">
            <Ionicons name="search" size={18} color="#8e8e93" />
          </View>
        </View>
      )}

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {!isCreating && trimmed && !exactMatch ? (
          <Pressable
            onPress={() => setIsCreating(true)}
            className="flex-row items-center h-[52px] gap-3.5 border-b border-[#2f2f2e]"
          >
            <Ionicons name="add" size={20} color="#0A84FF" />
            <P className="text-[17px] text-primary" numberOfLines={1}>
              Create “{trimmed}”
            </P>
          </Pressable>
        ) : null}

        {trimmed && !isCreating ? (
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
