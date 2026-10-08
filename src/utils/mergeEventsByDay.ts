import { eachDayOfInterval, format } from "date-fns";
import type { SelectEvent } from "../db/types";

export type EventsByDay = Map<string, SelectEvent[]>;

const DAY_KEY = "dd-MM-yyyy";

const isSameEvent = (a: SelectEvent, b: SelectEvent) =>
  a.id === b.id &&
  a.title === b.title &&
  a.color === b.color &&
  a.locked === b.locked &&
  a.start === b.start &&
  a.end === b.end;

const isSameDay = (a: SelectEvent[], b: SelectEvent[]) =>
  a.length === b.length && a.every((event, i) => isSameEvent(event, b[i]));

/**
 * Replaces the days in `range` with freshly fetched `events`, keeping the previous array for any
 * day that didn't change (and the previous map if nothing changed) so memoized days skip rendering.
 */
export const mergeEventsByDay = (
  prev: EventsByDay,
  events: SelectEvent[],
  range: { from: Date; to: Date }
): EventsByDay => {
  const fetched: EventsByDay = new Map();

  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const dayKey = format(event.start, DAY_KEY);
    fetched.set(dayKey, [...(fetched.get(dayKey) ?? []), event]);
  }

  let next: EventsByDay | null = null;

  for (const day of eachDayOfInterval({ start: range.from, end: range.to })) {
    const dayKey = format(day, DAY_KEY);
    const oldEvents = prev.get(dayKey);
    const newEvents = fetched.get(dayKey);

    if (!oldEvents && !newEvents) continue;
    if (oldEvents && newEvents && isSameDay(oldEvents, newEvents)) continue;

    next ??= new Map(prev);

    if (newEvents) {
      next.set(dayKey, newEvents);
    } else {
      next.delete(dayKey);
    }
  }

  return next ?? prev;
};
