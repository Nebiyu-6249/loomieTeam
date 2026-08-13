/**
 * The studio's bookable hours, and the only place they are defined.
 *
 * Slots are held as a weekday plus a wall-clock time in the studio's own
 * timezone, and converted to an absolute instant on the server. Nothing
 * trusts a time sent by a browser: the client asks which slots exist, the
 * server answers with UTC instants, and when a booking comes back the server
 * checks the instant against this table again before accepting it.
 *
 * That is the whole reason for this file. A booking system that takes the
 * visitor's word for what time it is books meetings that nobody attends.
 */

/** IANA zone. Override with STUDIO_TIMEZONE if the studio moves. */
export const STUDIO_TIMEZONE = process.env.STUDIO_TIMEZONE || "Asia/Dubai";

export const CALL_MINUTES = 20;

/** How far ahead the diary is open, and how much notice is required. */
export const HORIZON_DAYS = 21;
export const MIN_NOTICE_HOURS = 12;

/**
 * Weekly pattern, in studio wall-clock time. 1 = Monday.
 * Sunday to Thursday is the working week where the studio is.
 */
const WEEKLY: Record<number, string[]> = {
  0: ["10:00", "11:00", "14:00"],
  1: ["10:00", "11:00", "14:00", "15:00"],
  2: ["10:00", "11:00", "14:00", "15:00"],
  3: ["10:00", "11:00", "14:00", "15:00"],
  4: ["10:00", "11:00", "14:00"],
};

export interface Slot {
  /** ISO-8601 instant in UTC. The canonical identity of a slot. */
  start: string;
  /** Studio wall clock, for the confirmation copy. */
  studioTime: string;
}

/**
 * The offset of a zone at a given instant, in minutes.
 *
 * Intl is the only thing in the platform that knows about daylight saving and
 * political timezone changes, so the conversion is done by formatting the
 * instant in the target zone and reading the difference back, rather than by
 * hard-coding an offset that is wrong twice a year.
 */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return (asUtc - instant.getTime()) / 60000;
}

/** A wall-clock time in a zone, resolved to the correct UTC instant. */
function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // One correction is enough except at a DST boundary, where the offset used
  // for the guess differs from the offset at the corrected instant.
  const firstOffset = zoneOffsetMinutes(new Date(guess), timeZone);
  const corrected = guess - firstOffset * 60000;
  const secondOffset = zoneOffsetMinutes(new Date(corrected), timeZone);
  return new Date(guess - secondOffset * 60000);
}

/** Which calendar day it is in the studio's zone, for a given instant. */
function studioParts(instant: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/**
 * Every slot the studio offers between now-plus-notice and the horizon.
 *
 * Booked slots are excluded by the caller, which owns the store.
 */
export function availableSlots(now = new Date()): Slot[] {
  const earliest = now.getTime() + MIN_NOTICE_HOURS * 3600_000;
  const slots: Slot[] = [];

  const today = studioParts(now);

  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    // Step through calendar days in UTC and ask which studio day each lands
    // on, so a day is never skipped or repeated across a DST change.
    const probe = new Date(
      Date.UTC(today.year, today.month - 1, today.day + offset, 12)
    );
    const { year, month, day } = studioParts(probe);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    for (const time of WEEKLY[weekday] ?? []) {
      const [hour, minute] = time.split(":").map(Number);
      const start = zonedToUtc(year, month, day, hour, minute, STUDIO_TIMEZONE);

      if (start.getTime() < earliest) continue;

      slots.push({ start: start.toISOString(), studioTime: time });
    }
  }

  return slots;
}

/** True when the instant is one the studio actually offers. */
export function isOfferedSlot(startIso: string, now = new Date()): boolean {
  const target = new Date(startIso);
  if (Number.isNaN(target.getTime())) return false;
  return availableSlots(now).some((slot) => slot.start === startIso);
}
