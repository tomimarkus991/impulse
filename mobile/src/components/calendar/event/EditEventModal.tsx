import FontAwesome from "@expo/vector-icons/FontAwesome";
import clsx from "clsx";
import { format } from "date-fns";
import { eq } from "drizzle-orm";
import { Modal, Pressable, View } from "react-native";
import { db } from "../../../../app/_layout";
import { eventsTable } from "../../../db/schema";
import { SelectEvent } from "../../../db/types";
import { useModal } from "../../../hooks/ModalContext";
import { P } from "../../P";
import { ColorPicker } from "../ColorPicker";
import { useEvent } from "../../../hooks/EventContext";
import { onDataChanged } from "../../../data/onDataChanged";

interface Props {
  selectedEvent: SelectEvent | null;
}

export const EditEventModal = ({ selectedEvent }: Props) => {
  const { isEditEventModalVisible, setIsEditEventModalVisible, setIsColorPickerModalVisible } =
    useModal();
  const { events, setEvents } = useEvent();

  if (!selectedEvent) {
    return <></>;
  }

  const { start, id } = selectedEvent;
  const dayKey = format(start, "dd-MM-yyyy");
  // selectedEvent is a snapshot from when it was tapped, so read lock/colour from the live map
  const event = events.get(dayKey)?.find(e => e.id === id) ?? selectedEvent;

  const updateEvent = (changes: Partial<SelectEvent>) => {
    setEvents(prev => {
      const next = new Map(prev);
      next.set(
        dayKey,
        (prev.get(dayKey) ?? []).map(e => (e.id === id ? { ...e, ...changes } : e))
      );
      return next;
    });
  };

  const closeModal = () => {
    setIsEditEventModalVisible(false);
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
            {event.title}
          </P>
        </View>
        <View className="flex-row justify-around mt-16">
          <Pressable
            onPress={async () => {
              await db.delete(eventsTable).where(eq(eventsTable.id, id));

              setEvents(prev => {
                const next = new Map(prev);
                next.set(
                  dayKey,
                  (prev.get(dayKey) ?? []).filter(e => e.id !== id)
                );
                return next;
              });
              onDataChanged();

              closeModal();
            }}
          >
            <FontAwesome name="trash" size={24} color="red" className="" />
          </Pressable>
          <Pressable
            onPress={async () => {
              const locked = !event.locked;

              await db.update(eventsTable).set({ locked }).where(eq(eventsTable.id, id));
              updateEvent({ locked });
              onDataChanged();
            }}
          >
            {event.locked ? (
              <FontAwesome name="lock" size={24} color="white" className="" />
            ) : (
              <FontAwesome name="unlock-alt" size={24} color="white" className="" />
            )}
          </Pressable>
          <Pressable
            onPress={() => setIsColorPickerModalVisible(true)}
            className={clsx("m-2 rounded-full size-7")}
            style={{ backgroundColor: event.color }}
          />

          <ColorPicker
            onPick={async color => {
              await db.update(eventsTable).set({ color }).where(eq(eventsTable.id, id));
              updateEvent({ color });
              onDataChanged();
            }}
          />
        </View>
      </View>
    </Modal>
  );
};
