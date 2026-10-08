import { addMonths, startOfMonth } from "date-fns";
import React, { useMemo, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CreateEventModal } from "../../src/components/calendar/event/CreateEventModal";
import { EditEventModal } from "../../src/components/calendar/event/EditEventModal";
import { RestModal } from "../../src/components/calendar/modals/RestModal";
import { MonthPager } from "../../src/components/calendar/MonthPager";
import { DynamicHeader } from "../../src/components/ScrollHeader";
import { SelectEvent } from "../../src/db/types";
import { useMonthEvents } from "../../src/hooks/useMonthEvents";

export default function TabOneScreen() {
  const [selectedEvent, setSelectedEvent] = useState<SelectEvent | null>(null);
  // Months are addressed as offsets from the month the app was opened in
  const [anchorMonth] = useState(() => startOfMonth(new Date()));
  const [monthIndex, setMonthIndex] = useState(0);

  const currentMonth = useMemo(() => addMonths(anchorMonth, monthIndex), [anchorMonth, monthIndex]);

  useMonthEvents(currentMonth);

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <DynamicHeader month={currentMonth} />
        <MonthPager
          anchorMonth={anchorMonth}
          monthIndex={monthIndex}
          setMonthIndex={setMonthIndex}
          setSelectedEvent={setSelectedEvent}
        />
        <EditEventModal selectedEvent={selectedEvent} />
        <CreateEventModal />
        <RestModal />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
