import clsx from "clsx";
import { eachDayOfInterval, endOfWeek, format, isSameMonth, startOfWeek } from "date-fns";
import { View } from "react-native";
import { CalendarDay } from "./CalendarDay";
import React, { useMemo } from "react";
import { SelectEvent } from "../../db/types";

interface Props {
  events: Map<string, SelectEvent[]>;
  weekStartDate: Date;
  setSelectedEvent: (event: SelectEvent) => void;
  month: Date;
}

// Shared so empty days keep a stable reference and CalendarDay's memo holds
const NO_EVENTS: SelectEvent[] = [];

export const CalendarWeek = React.memo(
  ({ events, weekStartDate, setSelectedEvent, month }: Props) => {
    const daysForWeek = useMemo(
      () =>
        eachDayOfInterval({
          start: startOfWeek(weekStartDate),
          end: endOfWeek(weekStartDate),
        }),
      [weekStartDate]
    );

    return (
      <View className={clsx("flex-[7] flex-row border-b-2 border-[#222222]")}>
        {daysForWeek.map(day => {
          const eventsForDay = events.get(format(day, "dd-MM-yyyy")) ?? NO_EVENTS;

          return (
            <CalendarDay
              key={day.toISOString()}
              day={day}
              eventsForDay={eventsForDay}
              setSelectedEvent={setSelectedEvent}
              isCurrentMonth={isSameMonth(month, day)}
            />
          );
        })}
      </View>
    );
  }
);
