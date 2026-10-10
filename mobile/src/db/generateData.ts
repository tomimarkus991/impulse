import { startOfMonth, endOfMonth, eachDayOfInterval, add, setHours, setMinutes } from "date-fns";
import { db } from "../../app/_layout";
import { eventsTable } from "./schema";
import { CreateEvent, SelectEvent } from "./types";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const eventTypes = [
  { title: "Push", color: "#1e3a8a" },
  { title: "Pull", color: "#d6470e" },
  { title: "Legs", color: "#4c1d95" },
  { title: "Rest", color: "#14532d" },
  { title: "Forearms", color: "#881337" },
  { title: "Handstand", color: "#eab308" },
  { title: "Parem õlg valus", color: "#b91c1c" },
];

export const generateData = async (month: number, year: number) => {
  // await db.delete(eventsTable).all();
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const allEvents: CreateEvent[] = [];

  for (const day of days) {
    const numEvents = randInt(1, 6);
    for (let i = 0; i < numEvents; i++) {
      const eventType = eventTypes[randInt(0, eventTypes.length - 1)];

      // Random start hour between 6am and 10pm (22)
      const startHour = randInt(6, 20); // between 6:00 and 20:00
      const startMinute = randInt(0, 1) * 30; // either 0 or 30 minutes
      const durationHours = randInt(1, 2); // event duration: 1 or 2 hours

      const start = new Date(day);
      start.setHours(startHour, startMinute, 0, 0);

      const end = add(start, { hours: durationHours });

      allEvents.push({
        color: eventType.color,
        locked: false,
        title: eventType.title,
        start: start.toISOString(), // ensure UTC ISO format
        end: end.toISOString(),
      });
    }
  }

  console.log(allEvents);

  await db.insert(eventsTable).values(allEvents);

  console.log("done");
};
