import { formatDate, isToday } from "date-fns";
import React from "react";
import { Pressable } from "react-native";
import { SelectEvent } from "../../db/types";
import { useModal } from "../../hooks/ModalContext";
import { useSelect } from "../../hooks/SelectContext";
import { P } from "../P";
import { CalendarEvent } from "./CalendarEvent";

interface Props {
  eventsForDay: SelectEvent[];
  day: Date;
  setSelectedEvent: (event: SelectEvent) => void;
  isCurrentMonth: boolean;
}

export const CalendarDay = React.memo(
  ({ day, eventsForDay, setSelectedEvent, isCurrentMonth }: Props) => {
    const { setIsEditEventModalVisible, setIsCreateEventModalVisible } = useModal();
    const { setSelectedDate } = useSelect();

    return (
      <Pressable
        className="flex-1 pt-6 pb-12 mx-1"
        onPress={() => {
          setSelectedDate(day);
          setIsCreateEventModalVisible(true);
        }}
      >
        <P
          className={"text-center mb-1"}
          style={{
            color: isToday(day) ? "#0A84FF" : isCurrentMonth ? "#E5E5E7" : "#575757",
          }}
        >
          {formatDate(day, "dd")}
        </P>
        {eventsForDay.map(event => {
          return (
            <CalendarEvent
              key={event.id}
              onPress={() => {
                setSelectedEvent(event);
                setIsEditEventModalVisible(true);
              }}
              {...event}
            />
          );
        })}
      </Pressable>
    );
  }
);
