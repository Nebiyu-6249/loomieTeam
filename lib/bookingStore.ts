/**
 * Where bookings go before there is a calendar provider.
 *
 * In-process and non-durable: a restart forgets everything, and two server
 * instances do not share it. That is stated plainly rather than hidden,
 * because the alternative — a store that looks persistent and is not — is how
 * a studio double-books itself.
 *
 * Swapping this for Cal.com, Google Calendar or a database means implementing
 * the same four functions against that provider and changing nothing else.
 */

export interface Booking {
  start: string;
  name: string;
  email: string;
  service?: string;
  note?: string;
  timezone: string;
  createdAt: number;
}

const bookings = new Map<string, Booking>();

/** Recent submissions per client key, for rate limiting. */
const recent = new Map<string, number[]>();

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };

export function isTaken(start: string) {
  return bookings.has(start);
}

export function takenSlots(): string[] {
  return [...bookings.keys()];
}

export function record(booking: Booking) {
  bookings.set(booking.start, booking);
}

/** True when this caller is over the limit. Also prunes the window. */
export function rateLimited(key: string, now = Date.now()): boolean {
  const window = (recent.get(key) ?? []).filter(
    (at) => now - at < RATE_LIMIT.windowMs
  );
  window.push(now);
  recent.set(key, window);
  return window.length > RATE_LIMIT.max;
}

/** Same person, same slot, twice — usually a double-submit, not two people. */
export function alreadyBooked(email: string, start: string): boolean {
  const existing = bookings.get(start);
  return Boolean(existing && existing.email.toLowerCase() === email.toLowerCase());
}
