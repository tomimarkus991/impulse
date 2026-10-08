import { addDays, format, set, startOfDay } from "date-fns";
import type { SelectEvent } from "../db/types";

export const DIGEST_HOUR = 10;
export const DIGEST_MINUTE = 0;
export const DIGEST_WINDOW_DAYS = 30;

export type Digest = {
  date: Date;
  body: string;
};

const DAY_KEY = "dd-MM-yyyy";

export const getDigestWindow = (now: Date) => {
  const from = startOfDay(now);

  return { from, to: addDays(from, DIGEST_WINDOW_DAYS) };
};

export const buildDigests = (events: SelectEvent[], now: Date): Digest[] => {
  const eventsByDay = new Map<string, SelectEvent[]>();

  for (const event of [...events].sort((a, b) => a.start.localeCompare(b.start))) {
    const dayKey = format(event.start, DAY_KEY);
    eventsByDay.set(dayKey, [...(eventsByDay.get(dayKey) ?? []), event]);
  }

  const { from } = getDigestWindow(now);
  const digests: Digest[] = [];

  for (let i = 0; i < DIGEST_WINDOW_DAYS; i++) {
    const day = addDays(from, i);
    const dayEvents = eventsByDay.get(format(day, DAY_KEY));

    if (!dayEvents) continue;

    const date = set(day, { hours: DIGEST_HOUR, minutes: DIGEST_MINUTE, seconds: 0, milliseconds: 0 });

    if (date <= now) continue;

    digests.push({
      date,
      body: dayEvents.map(event => event.title || "Event").join(", "),
    });
  }

  return digests;
};
