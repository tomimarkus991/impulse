import { Alert, Modal, Pressable, View } from "react-native";
import { useModal } from "../../../hooks/ModalContext";
import { P } from "../../P";
import clsx from "clsx";
import { format, isSameDay, startOfDay } from "date-fns";
import { useEvent } from "../../../hooks/EventContext";

interface Props {}

export const RestModal = ({}: Props) => {
  const { isRestModalVisible, setIsRestModalVisible } = useModal();

  const { events, setEvents } = useEvent();

  return (
    <Modal
      visible={isRestModalVisible}
      onRequestClose={() => setIsRestModalVisible(false)}
      transparent
      animationType="slide"
    >
      <Pressable
        onPress={() => setIsRestModalVisible(false)}
        className="absolute top-0 left-0 w-full h-full bg-neutral-950 opacity-80"
      />
      <View className="p-8 mx-2 my-auto rounded-3xl bg-modal">
        <P className="mb-12 text-xl text-center">Do you want to take a rest day?</P>
        <P className="mb-12 text-xl text-center">
          This will move all regular future events that are not locked one day forward{" "}
        </P>

        <View className="flex flex-row justify-between">
          <Pressable
            className={clsx(
              "py-2 px-8 rounded-lg",
              "inline-flex items-center justify-center",
              "border-b-[6px]",
              "transition-all duration-300",
              "active:translate-y-[0.2rem] active:duration-75 active:border-[#14532D]",
              "bg-[#14532D] text-[#f3f2f0] border-[#0B411E]"
            )}
            onPress={() => {
              const restDate = startOfDay("day");

              const currentDayKey = format(restDate, "dd-MM-yyyy");
              const eventsOnCurrentDay = events.get(currentDayKey) || [];

              if (eventsOnCurrentDay.some(event => event.title === "Rest")) {
                Alert.alert("Today is already a rest day", "Go to sleep");
                return;
              }

              // get all the future events with db query
              // go through all and check if not locked add 1 day
              // after all are done, rerun getting events data from db

              // const updatedEvents = events.map(event => {
              //   if (
              //     dayjs(event.start).isAfter(restDate, "day") ||
              //     dayjs(event.start).isSame(restDate, "day")
              //   ) {
              //     if (event.locked) {
              //       return event;
              //     }

              //     return {
              //       ...event,
              //       start: dayjs(event.start).add(1, "day").startOf("day").toDate(),
              //       end: dayjs(event.start)
              //         .add(1, "day")
              //         .startOf("day")
              //         .add(1, "hour")
              //         .toDate(),
              //     };
              //   }
              //   return event;
              // });

              // updatedEvents.push({
              //   id: uuid.v4(),
              //   title: "Rest",
              //   start: restDate.toDate(),
              //   end: restDate.add(1, "hour").toDate(),
              //   color: colors.events.green,
              //   calendarId: 1,
              //   locked: false,
              // });

              //   setEvents(updatedEvents);

              setIsRestModalVisible(false);
            }}
          >
            <P className="text-xl">Take a rest day</P>
          </Pressable>
          <Pressable
            className={clsx(
              "py-2 px-4 rounded-lg",
              "inline-flex items-center justify-center",
              "border-b-[6px]",
              "transition-all duration-300",
              "active:translate-y-[0.2rem] active:duration-75 active:border-[#2A2B88]",
              "bg-[#2A2B88] text-[#f3f2f0] border-[#151D64]"
            )}
            onPress={() => {
              setIsRestModalVisible(false);
            }}
          >
            <P className="text-xl">No</P>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};
