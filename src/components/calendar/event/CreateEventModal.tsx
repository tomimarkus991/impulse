import FontAwesome from "@expo/vector-icons/FontAwesome";
import clsx from "clsx";
import { add, format } from "date-fns";
import { eq } from "drizzle-orm";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, TextInput, View } from "react-native";
import { db } from "../../../../app/_layout";
import { eventsTable, presetsTable } from "../../../db/schema";
import { SelectEvent, SelectPreset } from "../../../db/types";
import { useEvent } from "../../../hooks/EventContext";
import { useModal } from "../../../hooks/ModalContext";
import { P } from "../../P";
import { ColorPicker } from "../ColorPicker";
import { useSelect } from "../../../hooks/SelectContext";
import { colors } from "../../../config";
import { rescheduleDailyDigest } from "../../../notifications/dailyDigest";

interface PresetInputProps {
  backgroundColor: string;
  id: number;
  title: string;
}

interface CreateEventProps {
  isEditing: boolean;
  selectedDate: Date | null;
  title: string;
  backgroundColor: string;
}

const createDBEvent = async ({
  isEditing,
  selectedDate,
  backgroundColor,
  title,
}: CreateEventProps) => {
  if (!isEditing && selectedDate) {
    const utcStart = selectedDate.toISOString();
    const utcEnd = add(selectedDate, { hours: 2 }).toISOString();

    return (await db
      .insert(eventsTable)
      .values({
        title,
        color: backgroundColor,
        start: utcStart,
        end: utcEnd,
        locked: false,
      })
      .returning()) satisfies SelectEvent[];
  }
};

const PresetInput = ({ backgroundColor, id, title }: PresetInputProps) => {
  const { setIsCreateEventModalVisible, setIsColorPickerModalVisible } = useModal();
  const { selectedDate, selectedColor, setSelectedPreset, selectedPreset } = useSelect();
  const { setEvents, setPresets } = useEvent();

  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(title);

  useEffect(() => {
    (async () => {
      if (selectedColor && selectedPreset) {
        await db
          .update(presetsTable)
          .set({
            color: selectedColor,
          })
          .where(eq(presetsTable.id, selectedPreset));

        setPresets(await db.select().from(presetsTable));
      }
    })();
  }, [selectedColor]);

  if (!selectedDate) {
    return <P>Need Start Date</P>;
  }

  const createEvent = async () => {
    if (!text) {
      Alert.alert("Preset needs title");
      return;
    }

    const newEvent = (await createDBEvent({
      isEditing,
      backgroundColor,
      selectedDate,
      title: text,
    })) as SelectEvent[];

    setEvents(prevEvents => {
      const newEvents = new Map(prevEvents);

      const dayKey = format(newEvent[0].start, "dd-MM-yyyy");
      const existingEvents = newEvents.get(dayKey) || [];

      newEvents.set(dayKey, [...existingEvents, newEvent[0]]);

      return newEvents;
    });
    setIsCreateEventModalVisible(false);
    rescheduleDailyDigest();
  };

  const handleEventNameInputChange = async () => {
    await db
      .update(presetsTable)
      .set({
        title: text,
      })
      .where(eq(presetsTable.id, id));
    setIsEditing(false);
  };

  return (
    <View className="border-[3px] border-white flex-row items-center rounded-xl h-14">
      <Pressable
        className="flex-1 pl-3 pr-2"
        onLongPress={() => {
          setIsEditing(true);
        }}
        onPress={createEvent}
      >
        <TextInput
          className="h-full p-0 text-lg text-white"
          style={{
            fontFamily: "Rubik-Medium",
            textAlignVertical: "center",
            includeFontPadding: false,
          }}
          cursorColor="#fff"
          value={text}
          onChangeText={setText}
          editable={isEditing}
          onSubmitEditing={handleEventNameInputChange}
          onBlur={handleEventNameInputChange}
          numberOfLines={1}
          multiline={false}
          scrollEnabled={false}
        />
      </Pressable>

      <Pressable
        onPress={() => {
          setIsColorPickerModalVisible(true);
          setSelectedPreset(id);
        }}
        className={clsx("mr-3 rounded-full size-7")}
        style={{ backgroundColor }}
      />
    </View>
  );
};

export const CreateEventModal = () => {
  const { isCreateEventModalVisible, setIsCreateEventModalVisible, setIsColorPickerModalVisible } =
    useModal();
  const { presets, setPresets, setEvents } = useEvent();
  const { customEventSelectedColor, setSelectedPreset, selectedDate } = useSelect();
  const [title, setTitle] = useState("");

  useEffect(() => {
    const getPresets = async () => {
      setPresets(await db.select().from(presetsTable));
    };

    getPresets();
  }, []);

  const createEvent = async () => {
    if (!title) {
      Alert.alert("Need title");

      return;
    }

    const newEvent = (await createDBEvent({
      isEditing: false,
      backgroundColor: customEventSelectedColor || colors.events.kollane,
      selectedDate,
      title,
    })) as SelectEvent[];

    setEvents(prevEvents => {
      const newEvents = new Map(prevEvents);

      const dayKey = format(newEvent[0].start, "dd-MM-yyyy");
      const existingEvents = newEvents.get(dayKey) || [];

      newEvents.set(dayKey, [...existingEvents, newEvent[0]]);

      return newEvents;
    });

    setTitle("");
    setIsCreateEventModalVisible(false);
    rescheduleDailyDigest();
  };

  return (
    <Modal
      visible={isCreateEventModalVisible}
      onRequestClose={() => setIsCreateEventModalVisible(false)}
      transparent
      animationType="slide"
    >
      <Pressable
        onPress={() => setIsCreateEventModalVisible(false)}
        className="absolute top-0 left-0 w-full h-full bg-neutral-950 opacity-80"
      />
      <View className="p-8 mx-2 my-auto rounded-3xl bg-modal">
        <View className="flex-row">
          <View className="flex-col flex-1 gap-5 mr-5">
            {presets
              .filter(preset => preset.id <= 3)
              .map(preset => {
                return (
                  <PresetInput
                    key={preset.id}
                    backgroundColor={preset.color}
                    id={preset.id}
                    title={preset.title}
                  />
                );
              })}
          </View>

          <View className="flex-col flex-1 gap-5">
            {presets
              .filter(preset => preset.id >= 4)
              .map(preset => {
                return (
                  <PresetInput
                    key={preset.id}
                    backgroundColor={preset.color}
                    id={preset.id}
                    title={preset.title}
                  />
                );
              })}
          </View>
        </View>

        <View className="flex-row border-[3px] border-white rounded-xl mt-5">
          <TextInput
            className="w-[65%] text-white ml-2"
            placeholder="Title"
            placeholderTextColor="#9e9e9e"
            style={{ fontFamily: "Rubik-Medium" }}
            cursorColor="#fff"
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={createEvent}
            numberOfLines={1}
            multiline={false}
          />
          <FontAwesome name="unlock-alt" size={24} color="white" className="p-2 ml-4 mr-2" />
          <Pressable
            onPress={() => {
              setSelectedPreset(null);
              setIsColorPickerModalVisible(true);
            }}
            className={clsx("m-2 rounded-full size-7")}
            style={{ backgroundColor: customEventSelectedColor || colors.events.kollane }}
          />
        </View>
      </View>
      <ColorPicker />
    </Modal>
  );
};
