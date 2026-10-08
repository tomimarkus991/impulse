import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { and, gte, lte } from "drizzle-orm";
import { useEffect } from "react";
import { db } from "../../app/_layout";
import { eventsTable } from "../db/schema";
import { mergeEventsByDay } from "../utils/mergeEventsByDay";
import { useEvent } from "./EventContext";

// Months on each side to keep loaded, so a swiped-to month already has its events
const PREFETCH_MONTHS = 2;

export const useMonthEvents = (month: Date) => {
  const { setEvents } = useEvent();

  useEffect(() => {
    const from = startOfWeek(startOfMonth(subMonths(month, PREFETCH_MONTHS)));
    const to = endOfWeek(endOfMonth(addMonths(month, PREFETCH_MONTHS)));

    (async () => {
      const events = await db
        .select()
        .from(eventsTable)
        .where(
          and(gte(eventsTable.start, from.toISOString()), lte(eventsTable.start, to.toISOString()))
        );

      setEvents(prev => mergeEventsByDay(prev, events, { from, to }));
    })();
  }, [month.getFullYear(), month.getMonth()]);
};
