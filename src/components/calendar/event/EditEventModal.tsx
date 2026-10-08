import FontAwesome from "@expo/vector-icons/FontAwesome";
import clsx from "clsx";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { db } from "../../../../app/_layout";
import { eventsTable } from "../../../db/schema";
import { SelectEvent } from "../../../db/types";
import { useModal } from "../../../hooks/ModalContext";
import { useSelect } from "../../../hooks/SelectContext";
import { P } from "../../P";
import { ColorPicker } from "../ColorPicker";
import { useEvent } from "../../../hooks/EventContext";

interface Props {
  selectedEvent: SelectEvent | null;
}

export const EditEventModal = ({ selectedEvent }: Props) => {
  const { isEditEventModalVisible, setIsEditEventModalVisible, setIsColorPickerModalVisible } =
    useModal();
  const [currentLockState, setCurrentLockState] = useState(selectedEvent?.locked);
  const { setEditModalSelectedColor } = useSelect();
  const { events, setEvents } = useEvent();

  if (!selectedEvent) {
    return <></>;
  }

  const { start, title, id } = selectedEvent;

  const closeModal = () => {
    setIsEditEventModalVisible(false);
    setEditModalSelectedColor(null);
  };

  return (
    <Modal
      visible={isEditEventModalVisible}
      onRequestClose={closeModal}
      transparent
      animationType="slide"
    >
      <Pressable
        onPress={closeModal}
        className="absolute top-0 left-0 w-full h-full bg-neutral-950 opacity-80"
      />
      {/* <View className="items-center justify-center p-5 mx-2 mt-auto mb-auto rounded-md bg-modal">
        <P>{selectedEvent?.title}</P>
        <P>{selectedEvent?.id}</P>
        <Button title="Close" onPress={() => setIsEditEventModalVisible(false)} />
      </View> */}
      <View className="p-8 mx-2 my-auto rounded-3xl bg-modal">
        <View className="mb-8">
          <P className="text-lg" fontFamily="Rubik-Medium">
            {format(start, "dd-MM-yyyy")}
          </P>
        </View>
        <View className="flex items-center">
          <P className="text-3xl" fontFamily="Rubik-Medium">
            {title}
          </P>
        </View>
        <View className="flex-row justify-around mt-16">
          <Pressable
            onPress={async () => {
              await db.delete(eventsTable).where(eq(eventsTable.id, id));

              const date = format(start, "dd-MM-yyyy");

              const newEvents = new Map(events);
              const filtered = newEvents.get(date)?.filter(event => event.id !== id) || [];
              newEvents.set(date, filtered);

              setEvents(newEvents);

              closeModal();
            }}
          >
            <FontAwesome name="trash" size={24} color="red" className="" />
          </Pressable>
          <Pressable
            onPress={async () => {
              await db
                .update(eventsTable)
                .set({
                  locked: !currentLockState,
                })
                .where(eq(eventsTable.id, id));

              const date = format(start, "dd-MM-yyyy");

              const newEvents = new Map(events);

              const mapped =
                newEvents.get(date)?.map(event => {
                  if (event.id === id) {
                    return { ...event, locked: !currentLockState };
                  }

                  return event;
                }) || [];
              newEvents.set(date, mapped);

              setEvents(newEvents);

              setCurrentLockState(null);
            }}
          >
            {currentLockState ? (
              <FontAwesome name="lock" size={24} color="white" className="" />
            ) : (
              <FontAwesome name="unlock-alt" size={24} color="white" className="" />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setEditModalSelectedColor(selectedEvent?.color || null);
              setIsColorPickerModalVisible(true);

              const date = format(start, "dd-MM-yyyy");

              const newEvents = new Map(events);

              const mapped =
                newEvents.get(date)?.map(event => {
                  if (event.id === id) {
                    return { ...event, color: selectedEvent?.color };
                  }

                  return event;
                }) || [];
              newEvents.set(date, mapped);

              setEvents(newEvents);
            }}
            className={clsx("m-2 rounded-full size-7")}
            style={{ backgroundColor: selectedEvent?.color }}
          />

          <ColorPicker id={id} />
        </View>
      </View>
    </Modal>
  );
};
