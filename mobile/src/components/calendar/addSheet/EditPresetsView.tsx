import Ionicons from "@expo/vector-icons/Ionicons";
import React, { ReactNode, useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { SelectPreset } from "../../../db/types";
import { canPin, pinnedPresets } from "../../../utils/presets";
import { P } from "../../P";
import { ColorSwatches, inputTextStyle } from "./ColorSwatches";
import { PresetTile, textColorOn } from "./PresetTile";

interface Props {
  presets: SelectPreset[];
  onDone: () => void;
  onRename: (id: number, title: string) => void;
  onRecolor: (id: number, color: string) => void;
  onMove: (id: number, direction: -1 | 1) => void;
  onUnpin: (preset: SelectPreset) => void;
  onDelete: (preset: SelectPreset) => void;
  onNew: () => void;
  onOpenAll: () => void;
}

const IconButton = ({
  label,
  onPress,
  disabled,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    className="items-center justify-center rounded-full size-11"
    style={{ opacity: disabled ? 0.35 : 1 }}
  >
    {children}
  </Pressable>
);

export const EditPresetsView = ({
  presets,
  onDone,
  onRename,
  onRecolor,
  onMove,
  onUnpin,
  onDelete,
  onNew,
  onOpenAll,
}: Props) => {
  const pinned = pinnedPresets(presets);
  const [editingId, setEditingId] = useState<number | null>(pinned[0]?.id ?? null);
  const editing = presets.find(p => p.id === editingId) ?? null;
  const editingIndex = pinned.findIndex(p => p.id === editingId);
  const [draftTitle, setDraftTitle] = useState(editing?.title ?? "");

  useEffect(() => {
    setDraftTitle(editing?.title ?? "");
  }, [editingId]);

  const commitTitle = () => {
    const title = draftTitle.trim();
    if (editing && title && title !== editing.title) onRename(editing.id, title);
  };

  const tiles = [
    ...pinned.map(preset => (
      <PresetTile
        key={preset.id}
        title={preset.title}
        color={preset.color}
        selected={preset.id === editingId}
        onPress={() => {
          commitTitle();
          setEditingId(preset.id);
        }}
        corner={
          <Pressable
            accessibilityLabel={`Unpin ${preset.title}`}
            onPress={() => onUnpin(preset)}
            hitSlop={6}
            className="items-center justify-center rounded-full size-8 bg-black/35"
          >
            <Ionicons name="close" size={16} color={textColorOn(preset.color)} />
          </Pressable>
        }
      />
    )),
    ...(canPin(presets)
      ? [
          <View key="pin" className="flex-1 rounded-[22px] p-[3px] border-2 border-transparent">
            <Pressable
              onPress={onOpenAll}
              className="h-[72px] rounded-[18px] flex-row items-center justify-center gap-2 border-2 border-dashed border-[#48484a]"
            >
              <Ionicons name="pin-outline" size={18} color="#a1a1a6" />
              <P className="text-[15px] text-[#a1a1a6]" fontFamily="Rubik-Medium">
                Pin another
              </P>
            </Pressable>
          </View>,
        ]
      : []),
  ];

  const rows: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));

  return (
    <View className="gap-[18px]">
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <P className="text-[22px]" fontFamily="Rubik-SemiBold">
            Edit pinned
          </P>
          <P className="text-sm text-[#a1a1a6]">Tap a tile to change it</P>
        </View>
        <Pressable
          onPress={() => {
            commitTitle();
            onDone();
          }}
          className="items-center justify-center h-11 px-4 rounded-full bg-primary"
        >
          <P className="text-base text-white" fontFamily="Rubik-SemiBold">
            Done
          </P>
        </Pressable>
      </View>

      <View className="gap-2">
        {rows.map((row, i) => (
          <View key={i} className="flex-row gap-2">
            {row}
            {row.length === 1 && <View className="flex-1" />}
          </View>
        ))}
      </View>

      {editing && (
        <View className="gap-3 p-4 rounded-[18px] bg-[#2c2c2b]">
          <TextInput
            accessibilityLabel="Preset name"
            value={draftTitle}
            onChangeText={setDraftTitle}
            onBlur={commitTitle}
            onSubmitEditing={commitTitle}
            cursorColor="#fff"
            className="h-[52px] px-4 rounded-[14px] text-lg text-white bg-[#222221]"
            style={[inputTextStyle, { fontFamily: "Rubik-Medium" }]}
          />
          <View className="flex-row items-center">
            {editing.pinned && (
              <>
                <IconButton
                  label="Move earlier"
                  disabled={editingIndex <= 0}
                  onPress={() => onMove(editing.id, -1)}
                >
                  <Ionicons name="arrow-back" size={20} color="#E5E5E7" />
                </IconButton>
                <IconButton
                  label="Move later"
                  disabled={editingIndex === pinned.length - 1}
                  onPress={() => onMove(editing.id, 1)}
                >
                  <Ionicons name="arrow-forward" size={20} color="#E5E5E7" />
                </IconButton>
              </>
            )}
            <View className="flex-1" />
            <Pressable
              accessibilityLabel={`Delete ${editing.title}`}
              onPress={() => onDelete(editing)}
              className="flex-row items-center gap-1.5 px-3.5 h-11 rounded-full bg-[#3a2321]"
            >
              <Ionicons name="trash-outline" size={18} color="#ff6961" />
              <P className="text-base text-[#ff6961]" fontFamily="Rubik-Medium">
                Delete
              </P>
            </Pressable>
          </View>
          <ColorSwatches
            selected={editing.color}
            onSelect={color => onRecolor(editing.id, color)}
          />
        </View>
      )}

      <View className="flex-row gap-2.5">
        <Pressable
          onPress={() => {
            commitTitle();
            onNew();
          }}
          className="flex-row items-center justify-center flex-1 gap-2 h-[52px] rounded-[14px] border-2 border-dashed border-[#48484a]"
        >
          <Ionicons name="add" size={18} color="#E5E5E7" />
          <P className="text-base" fontFamily="Rubik-Medium">
            New preset
          </P>
        </Pressable>
        <Pressable
          onPress={() => {
            commitTitle();
            onOpenAll();
          }}
          className="items-center justify-center flex-1 h-[52px] rounded-[14px] bg-[#2c2c2b]"
        >
          <P className="text-base" fontFamily="Rubik-Medium">
            All presets ({presets.length})
          </P>
        </Pressable>
      </View>
    </View>
  );
};
