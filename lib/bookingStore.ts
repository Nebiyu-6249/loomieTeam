import "server-only";

import { serviceClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { CALL_MINUTES } from "./availability";

/**
 * Where bookings are kept.
 *
 * Postgres, in the same database as everything else. That is the point: a
 * booking is a row an administrator can open, filter by service, mark as
 * completed and reply to, rather than a JSON blob in a key-value store that
 * only this route knows how to read.
 *
 * ── Why the slot cannot be double-booked ─────────────────────────────────
 * Not by checking first and inserting after — two requests can both check an
 * empty slot before either inserts. The database holds a partial unique index:
 *
 *   create unique index bookings_one_live_per_slot
 *     on bookings (start_at) where status <> 'cancelled';
 *
 * so the second insert fails with 23505 and `claim` returns false. Partial,
 * because a cancelled booking must not keep holding a time nobody is coming to.
 * The check that matters is the one the database makes.
 *
 * The in-process Map below is for development and the test suite. It is not a
 * diary — it dies with the process and is invisible to every other instance —
 * and `storageAcceptsBookings` refuses to let production use it.
 */

export interface Booking {
  /** The reference quoted back to the visitor. Short enough to read aloud. */
  id: string;
  start: string;
  name: string;
  email: string;
  /** The service's slug, or undefined for "not sure yet". */
  service?: string;
  /** What the service is called, for the email. */
  serviceTitle?: string;
  note?: string;
  timezone: string;
  createdAt: number;
  /**
   * Whether the visitor's own confirmation email actually went out.
   *
   * Stored rather than assumed. The slot is claimed before anything is sent —
   * it has to be, or two people can be emailed the same time — so a booking
   * exists for a moment before its delivery is known, and the duplicate path
   * used to fill that gap by returning `true`. That meant a visitor whose
   * receipt had failed, hitting submit again, was told a confirmation had been
   * sent. It had not.
   */
  visitorConfirmed?: boolean;
}

export interface Delivered {
  visitorConfirmed: boolean;
  studioNotified: boolean;
}

export interface BookingStore {
  /** Human-readable, for the API's own honesty about persistence. */
  readonly kind: "postgres" | "memory";
  readonly durable: boolean;
  get(start: string): Promise<Booking | null>;
  /** False when the slot was already taken — the caller must not overwrite. */
  claim(booking: Booking): Promise<boolean>;
  /** Records what delivery actually achieved, once it is known. */
  settle(start: string, delivered: Delivered): Promise<void>;
  taken(): Promise<string[]>;
  /** Hands a slot back when the booking could not be completed. */
  release(start: string): Promise<void>;
}

/**
 * A reference a person can read over the phone.
 *
 * No I, O, 0 or 1: the reference exists to be spoken and typed back, and those
 * four are the ones that get heard wrong. Six characters out of a 32-character
 * alphabet is a billion possibilities, and the column is unique, so a
 * collision is a failed insert rather than a wrong booking.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function bookingCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const body = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `LM-${body}`;
}

/* ── Postgres ──────────────────────────────────────────────────────────── */

interface BookingRow {
  booking_code: string;
  name: string;
  email: string;
  start_at: string;
  visitor_timezone: string;
  note: string | null;
  visitor_confirmed: boolean;
  created_at: string;
  services: { slug: string; title: string } | null;
}

const toBooking = (row: BookingRow): Booking => ({
  id: row.booking_code,
  start: new Date(row.start_at).toISOString(),
  name: row.name,
  email: row.email,
  service: row.services?.slug,
  serviceTitle: row.services?.title,
  note: row.note ?? undefined,
  timezone: row.visitor_timezone,
  createdAt: new Date(row.created_at).getTime(),
  visitorConfirmed: row.visitor_confirmed,
});

const SELECT = `booking_code, name, email, start_at, visitor_timezone, note,
                visitor_confirmed, created_at, services:service_id ( slug, title )`;

function postgresStore(): BookingStore {
  return {
    kind: "postgres",
    durable: true,

    async get(start) {
      const supabase = serviceClient();
      const { data, error } = await supabase
        .from("bookings")
        .select(SELECT)
        .eq("start_at", start)
        .neq("status", "cancelled")
        .maybeSingle();

      if (error) throw error;
      return data ? toBooking(data as unknown as BookingRow) : null;
    },

    async claim(booking) {
      const supabase = serviceClient();

      // The slug is what the form submits and what the route validated; the
      // row wants the id, so it is resolved here rather than making every
      // caller carry a uuid it has no other use for.
      let serviceId: string | null = null;
      if (booking.service) {
        const { data } = await supabase
          .from("services")
          .select("id")
          .eq("slug", booking.service)
          .maybeSingle();
        serviceId = (data as { id: string } | null)?.id ?? null;
      }

      const start = new Date(booking.start);
      const end = new Date(start.getTime() + CALL_MINUTES * 60_000);

      const { error } = await supabase.from("bookings").insert({
        booking_code: booking.id,
        name: booking.name,
        email: booking.email,
        service_id: serviceId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        visitor_timezone: booking.timezone,
        note: booking.note ?? null,
        status: "pending",
      });

      // 23505 is a unique violation, which here means one of two things: the
      // slot already has a live booking, or the generated reference collided.
      // Both are "this insert did not happen"; the caller retries or refuses.
      if (error?.code === "23505") return false;
      if (error) throw error;
      return true;
    },

    async settle(start, delivered) {
      const supabase = serviceClient();
      const { error } = await supabase
        .from("bookings")
        .update({
          visitor_confirmed: delivered.visitorConfirmed,
          studio_notified: delivered.studioNotified,
          // Confirmed means the studio knows about it. A booking nobody at the
          // studio has been told about is still pending, whatever the visitor
          // was shown.
          status: delivered.studioNotified ? "confirmed" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("start_at", start)
        .neq("status", "cancelled");

      if (error) throw error;
    },

    async taken() {
      const supabase = serviceClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("start_at")
        .neq("status", "cancelled")
        .gte("start_at", new Date().toISOString());

      if (error) throw error;
      return ((data ?? []) as { start_at: string }[]).map((row) =>
        new Date(row.start_at).toISOString()
      );
    },

    async release(start) {
      // Deleted rather than cancelled. A booking that failed to reach the
      // studio was never a booking, and leaving a cancelled row behind would
      // put an appointment nobody made into the admin's list.
      const supabase = serviceClient();
      const { error } = await supabase.from("bookings").delete().eq("start_at", start);
      if (error) throw error;
    },
  };
}

/* ── In-process fallback, for local development only ───────────────────── */

const bookings = new Map<string, Booking>();

const memoryStore: BookingStore = {
  kind: "memory",
  durable: false,

  async get(start) {
    return bookings.get(start) ?? null;
  },

  async claim(booking) {
    if (bookings.has(booking.start)) return false;
    bookings.set(booking.start, booking);
    return true;
  },

  async settle(start, delivered) {
    const booking = bookings.get(start);
    if (booking) {
      bookings.set(start, { ...booking, visitorConfirmed: delivered.visitorConfirmed });
    }
  },

  async taken() {
    return [...bookings.keys()];
  },

  async release(start) {
    bookings.delete(start);
  },
};

let warned = false;

export function getBookingStore(): BookingStore {
  if (isSupabaseConfigured() && process.env.SUPABASE_SECRET_KEY) {
    return postgresStore();
  }

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[loomie] Supabase is not configured. The booking route will refuse " +
        "bookings rather than hold them in process memory, where they would be " +
        "lost on restart and invisible to other instances."
    );
  }

  return memoryStore;
}

/**
 * Whether this process may accept a real booking.
 *
 * A Map that dies with the process is fine for development and for the test
 * suite, and is not a diary. In production it would lose every booking on the
 * next deploy and let two visitors claim one slot from two instances, so the
 * route refuses rather than accepting into it.
 */
export function storageAcceptsBookings(store: BookingStore) {
  return store.durable || process.env.NODE_ENV !== "production";
}
