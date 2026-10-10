import { add, addDays, format } from "date-fns";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../../../app/_layout";
import { colors } from "../../../config";
import {
  createPreset,
  deletePreset,
  loadPresets,
  movePinnedPreset,
  setPresetPinned,
  updatePreset,
} from "../../../db/presets";
import { eventsTable } from "../../../db/schema";
import { SelectEvent, SelectPreset } from "../../../db/types";
import { useEvent } from "../../../hooks/EventContext";
import { useModal } from "../../../hooks/ModalContext";
import { useSelect } from "../../../hooks/SelectContext";
import { onDataChanged } from "../../../data/onDataChanged";
import { MAX_PINNED } from "../../../utils/presets";
import { AddedToast } from "./AddedToast";
import { AddView } from "./AddView";
import { AllPresetsView } from "./AllPresetsView";
import { EditPresetsView } from "./EditPresetsView";

type SheetView = "add" | "all" | "edit";

const DEFAULT_COLOR = colors.events.kollane;
const DAY_KEY = "dd-MM-yyyy";

export const AddSheet = () => {
  const { isCreateEventModalVisible: visible, setIsCreateEventModalVisible } = useModal();
  const { presets, setPresets, setEvents } = useEvent();
  const { selectedDate, setSelectedDate } = useSelect();
  const insets = useSafeAreaInsets();

  const [view, setView] = useState<SheetView>("add");
  const [allReturnsTo, setAllReturnsTo] = useState<SheetView>("add");
  const [allStartsCreating, setAllStartsCreating] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customColor, setCustomColor] = useState(DEFAULT_COLOR);
  const [locked, setLocked] = useState(false);
  const [addedEvent, setAddedEvent] = useState<SelectEvent | null>(null);

  const date = selectedDate ?? new Date();

  const refreshPresets = async () => setPresets(await loadPresets());

  useEffect(() => {
    refreshPresets();
  }, []);

  // Every open starts fresh on the add view
  useEffect(() => {
    if (!visible) return;

    setView("add");
    setSelectedPresetId(null);
    setCustomTitle("");
    setCustomColor(DEFAULT_COLOR);
    setLocked(false);
  }, [visible]);

  const close = () => setIsCreateEventModalVisible(false);

  const selectedPreset = presets.find(p => p.id === selectedPresetId);
  const target = selectedPreset
    ? { title: selectedPreset.title, color: selectedPreset.color }
    : customTitle.trim()
      ? { title: customTitle.trim(), color: customColor }
      : null;

  const addEvent = async () => {
    if (!target) return;

    const [event] = await db
      .insert(eventsTable)
      .values({
        ...target,
        start: date.toISOString(),
        end: add(date, { hours: 2 }).toISOString(),
        locked,
      })
      .returning();

    setEvents(prev => {
      const next = new Map(prev);
      const dayKey = format(event.start, DAY_KEY);
      next.set(dayKey, [...(prev.get(dayKey) ?? []), event]);
      return next;
    });
    onDataChanged();

    close();
    setAddedEvent(event);
  };

  const undoAdd = async (event: SelectEvent) => {
    setAddedEvent(null);
    await db.delete(eventsTable).where(eq(eventsTable.id, event.id));

    setEvents(prev => {
      const next = new Map(prev);
      const dayKey = format(event.start, DAY_KEY);
      next.set(
        dayKey,
        (prev.get(dayKey) ?? []).filter(e => e.id !== event.id)
      );
      return next;
    });
    onDataChanged();
  };

  const openAll = (from: SheetView, creating = false) => {
    setAllReturnsTo(from);
    setAllStartsCreating(creating);
    setView("all");
  };

  const togglePin = async (preset: SelectPreset) => {
    const ok = await setPresetPinned(presets, preset.id, !preset.pinned);

    if (!ok) {
      Alert.alert(`You can pin up to ${MAX_PINNED}`, "Unpin one first to make room.");
      return;
    }
    refreshPresets();
  };

  const confirmDelete = (preset: SelectPreset) => {
    Alert.alert(`Delete ${preset.title}?`, "Events already on the calendar are kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePreset(preset.id);
          if (selectedPresetId === preset.id) setSelectedPresetId(null);
          refreshPresets();
        },
      },
    ]);
  };

  const goBack = () => {
    if (view === "all") setView(allReturnsTo);
    else if (view === "edit") setView("add");
    else close();
  };

  return (
    <>
      <Modal
        visible={visible}
        onRequestClose={goBack}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
      >
        <KeyboardAvoidingView behavior="padding" className="justify-end flex-1">
          <Pressable
            accessibilityLabel="Close"
            onPress={close}
            className="absolute inset-0 bg-neutral-950/80"
          />
          <View
            className="px-5 pt-2.5 rounded-t-[28px] bg-modal"
            style={{
              paddingBottom: insets.bottom + 20,
              maxHeight: "92%",
              height: view === "all" ? "92%" : undefined,
            }}
          >
            <View className="self-center w-9 h-[5px] mb-5 rounded-full bg-[#48484a]" />

            {view === "add" && (
              <AddView
                presets={presets}
                date={date}
                onChangeDay={delta => setSelectedDate(addDays(date, delta))}
                selectedPresetId={selectedPresetId}
                onSelectPreset={id => {
                  setSelectedPresetId(id);
                  setCustomTitle("");
                }}
                customTitle={customTitle}
                onChangeCustomTitle={title => {
                  setCustomTitle(title);
                  if (title.trim()) setSelectedPresetId(null);
                }}
                customColor={customColor}
                onChangeCustomColor={setCustomColor}
                locked={locked}
                onToggleLocked={() => setLocked(value => !value)}
                addLabel={target ? `Add ${target.title} to ${format(date, "EEE d MMM")}` : null}
                addColor={target?.color ? target.color : null}
                onAdd={addEvent}
                onOpenAll={() => openAll("add")}
                onOpenEdit={() => setView("edit")}
              />
            )}

            {view === "all" && (
              <AllPresetsView
                presets={presets}
                date={date}
                startCreating={allStartsCreating}
                onBack={goBack}
                onSelect={id => {
                  setSelectedPresetId(id);
                  setCustomTitle("");
                  setView("add");
                }}
                onTogglePin={togglePin}
                onDelete={confirmDelete}
                onCreate={async (title, color) => {
                  const preset = await createPreset(presets, { title, color });
                  await refreshPresets();
                  setSelectedPresetId(preset.id);
                  setCustomTitle("");
                  setView("add");
                }}
              />
            )}

            {view === "edit" && (
              <EditPresetsView
                presets={presets}
                onDone={() => setView("add")}
                onRename={async (id, title) => {
                  await updatePreset(id, { title });
                  refreshPresets();
                }}
                onRecolor={async (id, color) => {
                  await updatePreset(id, { color });
                  refreshPresets();
                }}
                onMove={async (id, direction) => {
                  await movePinnedPreset(presets, id, direction);
                  refreshPresets();
                }}
                onUnpin={togglePin}
                onDelete={confirmDelete}
                onNew={() => openAll("edit", true)}
                onOpenAll={() => openAll("edit")}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {addedEvent && (
        <AddedToast
          event={addedEvent}
          onUndo={() => undoAdd(addedEvent)}
          onDismiss={() => setAddedEvent(null)}
        />
      )}
    </>
  );
};
