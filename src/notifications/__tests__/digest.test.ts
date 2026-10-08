process.env.TZ = "Europe/Tallinn";

import type { SelectEvent } from "../../db/types";
import { buildDigests, DIGEST_WINDOW_DAYS, getDigestWindow } from "../digest";

let nextId = 1;
const event = (start: Date, title: string): SelectEvent => ({
  id: nextId++,
  color: "#000000",
  locked: false,
  start: start.toISOString(),
  end: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  title,
});

// Local-time constructor (months are 1-based here for readability)
const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe("getDigestWindow", () => {
  it("spans from start of today for DIGEST_WINDOW_DAYS days", () => {
    const { from, to } = getDigestWindow(local(2026, 10, 8, 15, 30));

    expect(from).toEqual(local(2026, 10, 8));
    expect(to).toEqual(local(2026, 10, 8 + DIGEST_WINDOW_DAYS));
  });
});

describe("buildDigests", () => {
  const now = local(2026, 10, 8, 8, 0);

  it("groups events by local day with a 10:00 trigger", () => {
    const digests = buildDigests(
      [
        event(local(2026, 10, 9, 18), "Pull"),
        event(local(2026, 10, 9, 7), "Push"),
        event(local(2026, 10, 11, 12), "Legs"),
      ],
      now
    );

    expect(digests).toEqual([
      { date: local(2026, 10, 9, 10), body: "Push, Pull" },
      { date: local(2026, 10, 11, 10), body: "Legs" },
    ]);
  });

  it("uses local day for events stored in UTC near midnight", () => {
    // 00:30 local on Oct 10 is 21:30Z on Oct 9
    const digests = buildDigests([event(local(2026, 10, 10, 0, 30), "Rest")], now);

    expect(digests).toEqual([{ date: local(2026, 10, 10, 10), body: "Rest" }]);
  });

  it("falls back to 'Event' for empty titles", () => {
    const digests = buildDigests([event(local(2026, 10, 9, 12), "")], now);

    expect(digests[0].body).toBe("Event");
  });

  it("includes today when it is before 10:00", () => {
    const digests = buildDigests([event(local(2026, 10, 8, 18), "Push")], now);

    expect(digests).toEqual([{ date: local(2026, 10, 8, 10), body: "Push" }]);
  });

  it("skips today when 10:00 has already passed", () => {
    const digests = buildDigests(
      [event(local(2026, 10, 8, 18), "Push")],
      local(2026, 10, 8, 10, 0)
    );

    expect(digests).toEqual([]);
  });

  it("returns nothing when there are no events", () => {
    expect(buildDigests([], now)).toEqual([]);
  });

  it("ignores events outside the window", () => {
    const digests = buildDigests(
      [
        event(local(2026, 10, 7, 12), "Yesterday"),
        event(local(2026, 10, 8 + DIGEST_WINDOW_DAYS, 12), "Too far"),
      ],
      now
    );

    expect(digests).toEqual([]);
  });

  it("keeps 10:00 local time across a DST transition", () => {
    // Europe/Tallinn leaves DST on 2026-10-25 (UTC+3 -> UTC+2)
    const digests = buildDigests([event(local(2026, 10, 26, 12), "Push")], now);

    expect(digests[0].date.getHours()).toBe(10);
    expect(digests[0].date.toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });
});
