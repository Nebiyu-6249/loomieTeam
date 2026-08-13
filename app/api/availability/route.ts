import { NextResponse } from "next/server";
import {
  CALL_MINUTES,
  STUDIO_TIMEZONE,
  availableSlots,
} from "@/lib/availability";
import { getBookingStore } from "@/lib/bookingStore";

/**
 * What the studio has free, as absolute instants.
 *
 * The response carries UTC only. The browser converts for display, which is
 * the one thing it is genuinely better placed to do — it knows the visitor's
 * zone — while the server stays the authority on which instants exist.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getBookingStore();
  const taken = new Set(await store.taken());
  const slots = availableSlots().filter((slot) => !taken.has(slot.start));

  return NextResponse.json(
    {
      studioTimezone: STUDIO_TIMEZONE,
      durationMinutes: CALL_MINUTES,
      slots,
      /** So the interface can tell whether the diary survives a restart. */
      persisted: store.durable,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
