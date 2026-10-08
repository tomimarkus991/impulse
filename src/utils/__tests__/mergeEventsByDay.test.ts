process.env.TZ = "Europe/Tallinn";

import { describe, expect, it } from "@jest/globals";
import type { SelectEvent } from "../../db/types";
import { mergeEventsByDay } from "../mergeEventsByDay";

const event = (id: number, start: Date, title = "Push"): SelectEvent => ({
  id,
  color: "#000000",
  locked: false,
  start: start.toISOString(),
  end: start.toISOString(),
  title,
});

const local = (m: number, d: number, h = 12) => new Date(2026, m - 1, d, h);
const range = { from: local(10, 1, 0), to: local(10, 31, 0) };

describe("mergeEventsByDay", () => {
  it("groups fetched events by local day in start order", () => {
    const result = mergeEventsByDay(
      new Map(),
      [event(2, local(10, 5, 18)), event(1, local(10, 5, 8)), event(3, local(10, 6))],
      range
    );

    expect([...result.keys()]).toEqual(["05-10-2026", "06-10-2026"]);
    expect(result.get("05-10-2026")!.map(e => e.id)).toEqual([1, 2]);
  });

  it("returns the same map when nothing changed", () => {
    const events = [event(1, local(10, 5))];
    const prev = mergeEventsByDay(new Map(), events, range);

    expect(mergeEventsByDay(prev, [event(1, local(10, 5))], range)).toBe(prev);
  });

  it("reuses arrays of unchanged days", () => {
    const prev = mergeEventsByDay(
      new Map(),
      [event(1, local(10, 5)), event(2, local(10, 6))],
      range
    );
    const next = mergeEventsByDay(
      prev,
      [event(1, local(10, 5)), event(2, local(10, 6), "Pull")],
      range
    );

    expect(next).not.toBe(prev);
    expect(next.get("05-10-2026")).toBe(prev.get("05-10-2026"));
    expect(next.get("06-10-2026")![0].title).toBe("Pull");
  });

  it("removes days in range that no longer have events", () => {
    const prev = mergeEventsByDay(new Map(), [event(1, local(10, 5))], range);

    expect(mergeEventsByDay(prev, [], range).has("05-10-2026")).toBe(false);
  });

  it("keeps days outside the fetched range", () => {
    const prev = mergeEventsByDay(new Map(), [event(1, local(9, 20))], {
      from: local(9, 1, 0),
      to: local(9, 30, 0),
    });
    const next = mergeEventsByDay(prev, [event(2, local(10, 5))], range);

    expect(next.get("20-09-2026")).toBe(prev.get("20-09-2026"));
    expect(next.has("05-10-2026")).toBe(true);
  });
});
