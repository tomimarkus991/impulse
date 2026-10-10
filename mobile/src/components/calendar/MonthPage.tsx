import {
  addMonths,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import React, { useMemo } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { SelectEvent } from "../../db/types";
import { useEvent } from "../../hooks/EventContext";
import { CalendarWeek } from "./CalendarWeek";

interface Props {
  anchorMonth: Date;
  monthIndex: number;
  setSelectedEvent: (event: SelectEvent) => void;
}

export const MonthPage = React.memo(({ anchorMonth, monthIndex, setSelectedEvent }: Props) => {
  const { events } = useEvent();

  const month = useMemo(() => addMonths(anchorMonth, monthIndex), [anchorMonth, monthIndex]);

  const weekStartDates = useMemo(
    () =>
      eachWeekOfInterval({
        start: startOfWeek(startOfMonth(month)),
        end: endOfWeek(endOfMonth(month)),
      }),
    [month]
  );

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {weekStartDates.map((weekStartDate, i) => (
        <CalendarWeek
          key={i}
          events={events}
          setSelectedEvent={setSelectedEvent}
          weekStartDate={weekStartDate}
          month={month}
        />
      ))}
    </ScrollView>
  );
});
