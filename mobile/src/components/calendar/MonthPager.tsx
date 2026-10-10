import React, { useEffect, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SelectEvent } from "../../db/types";
import { MonthPage } from "./MonthPage";

interface Props {
  anchorMonth: Date;
  monthIndex: number;
  setMonthIndex: (index: number) => void;
  setSelectedEvent: (event: SelectEvent) => void;
}

const SWIPE_DISTANCE_RATIO = 0.25;
const SWIPE_VELOCITY = 500;

interface PageProps {
  pageIndex: number;
  offset: SharedValue<number>;
  width: number;
  children: React.ReactNode;
}

// Each page translates itself (rather than one shared track) so the visible page always sits inside
// the container's bounds, which Android needs for touches to reach it
const Page = ({ pageIndex, offset, width, children }: PageProps) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: pageIndex * width + offset.value }],
  }));

  return (
    <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width }, style]}>
      {children}
    </Animated.View>
  );
};

/**
 * Horizontal month pager. Pages are keyed and positioned by month index, so the previous and next
 * months stay mounted and nothing remounts or jumps when the index changes.
 */
export const MonthPager = ({ anchorMonth, monthIndex, setMonthIndex, setSelectedEvent }: Props) => {
  const { width } = useWindowDimensions();
  const index = useSharedValue(monthIndex);
  const offset = useSharedValue(-monthIndex * width);

  // Keep the track aligned when the screen width changes (rotation)
  useEffect(() => {
    index.value = monthIndex;
    offset.value = -monthIndex * width;
  }, [width]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-15, 15])
        .onUpdate(e => {
          offset.value = -index.value * width + e.translationX;
        })
        .onEnd(e => {
          const goNext =
            e.translationX < -width * SWIPE_DISTANCE_RATIO || e.velocityX < -SWIPE_VELOCITY;
          const goPrev =
            e.translationX > width * SWIPE_DISTANCE_RATIO || e.velocityX > SWIPE_VELOCITY;
          const target = index.value + (goNext ? 1 : goPrev ? -1 : 0);

          offset.value = withTiming(-target * width, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
          });

          if (target !== index.value) {
            index.value = target;
            runOnJS(setMonthIndex)(target);
          }
        }),
    [width, setMonthIndex]
  );

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1 overflow-hidden">
        {[monthIndex - 1, monthIndex, monthIndex + 1].map(i => (
          <Page key={i} pageIndex={i} offset={offset} width={width}>
            <MonthPage
              anchorMonth={anchorMonth}
              monthIndex={i}
              setSelectedEvent={setSelectedEvent}
            />
          </Page>
        ))}
      </View>
    </GestureDetector>
  );
};
