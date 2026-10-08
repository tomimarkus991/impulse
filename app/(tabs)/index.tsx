import { eachWeekOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import React, { useMemo, useRef, useState } from "react";
import { Animated, ScrollView } from "react-native";
import { Gesture, GestureDetector, GestureType } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { CalendarWeek } from "../../src/components/calendar/CalendarWeek";
import { CreateEventModal } from "../../src/components/calendar/event/CreateEventModal";
import { EditEventModal } from "../../src/components/calendar/event/EditEventModal";
import { RestModal } from "../../src/components/calendar/modals/RestModal";
import { DynamicHeader } from "../../src/components/ScrollHeader";
import { SelectEvent } from "../../src/db/types";
import { useEvent } from "../../src/hooks/EventContext";
import { getSwipeMonthGesture } from "../../src/hooks/getSwipeMonthGesture";
import { useMonthEvents } from "../../src/hooks/useMonthEvents";
import { useSwipeInfo } from "../../src/hooks/useSwipeInfo";
import { SwipeInfo } from "../../src/types";

export default function TabOneScreen() {
  const [swipeInfo, setSwipeInfo] = useState<SwipeInfo>({ direction: "none", id: 0 });
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const panGestureRef = useRef<GestureType>(Gesture.Pan());
  const [selectedEvent, setSelectedEvent] = useState<SelectEvent | null>(null);
  const { events } = useEvent();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const weekStartDates = useMemo(
    () =>
      eachWeekOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth)),
      }),
    [currentMonth]
  );

  const swipeMonthGesture = getSwipeMonthGesture({ setSwipeInfo, panGestureRef });

  useSwipeInfo({ setCurrentMonth, swipeInfo, translateX, opacity });
  useMonthEvents(currentMonth);

  return (
    <SafeAreaProvider>
      <GestureDetector gesture={swipeMonthGesture}>
        <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
          <DynamicHeader month={currentMonth} translateX={translateX} opacity={opacity} />
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Animated.View style={{ flex: 1, transform: [{ translateX }], opacity }}>
              {weekStartDates.map(weekStartDate => {
                return (
                  <CalendarWeek
                    key={weekStartDate.toISOString()}
                    events={events}
                    setSelectedEvent={setSelectedEvent}
                    weekStartDate={weekStartDate}
                    month={currentMonth}
                  />
                );
              })}
            </Animated.View>
            <EditEventModal selectedEvent={selectedEvent} />
            <CreateEventModal />
            <RestModal />
          </ScrollView>
        </SafeAreaView>
      </GestureDetector>
    </SafeAreaProvider>
  );
}
