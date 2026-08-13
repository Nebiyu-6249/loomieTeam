import { NextResponse } from "next/server";
import { CALL_MINUTES, STUDIO_TIMEZONE, isOfferedSlot } from "@/lib/availability";
import { RATE_LIMIT, getBookingStore } from "@/lib/bookingStore";
import { deliver, deliveryConfigured } from "@/lib/notify";
import { SERVICE_OPTIONS } from "@/lib/services";

/**
 * Accepts a booking, or explains why it did not.
 *
 * Nothing the browser sends is trusted. The slot is re-checked against the
 * studio's own availability table, the service against the studio's own list,
 * and the timezone against the platform's zone database. The visitor's
 * timezone is recorded for the confirmation email but never used to decide
 * when the meeting is — the instant is.
 *
 * This route does not pretend. It refuses when there is nowhere to send the
 * booking, it refuses when the email actually fails, and its success response
 * says which of the two messages were really sent so the interface can only
 * ever claim what happened.
 */

export const dynamic = "force-dynamic";

/** Under this and it was filled by a script, not a person. */
const MIN_FILL_MS = 3000;
const MAX_NOTE = 1200;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Payload {
  start?: unknown;
  name?: unknown;
  email?: unknown;
  service?: unknown;
  note?: unknown;
  timezone?: unknown;
  /** Honeypot. Real people cannot see the field. */
  company?: unknown;
  /** When the form was opened, for the minimum fill time. */
  openedAt?: unknown;
}

const fail = (status: number, error: string, field?: string) =>
  NextResponse.json({ ok: false, error, field }, { status });

function validTimezone(zone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Same-origin only. A browser cannot forge Origin, and a server-to-server
  // caller has no business posting here.
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (new URL(origin).host !== host) return fail(403, "Cross-origin request refused.");
    } catch {
      return fail(400, "Bad origin.");
    }
  }

  const store = getBookingStore();

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if ((await store.hit(key, RATE_LIMIT.windowMs)) > RATE_LIMIT.max) {
    return fail(429, "Too many requests. Try again shortly.");
  }

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return fail(400, "Malformed request.");
  }

  // Honeypot and dwell time, before anything expensive.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return fail(400, "Rejected.");
  }
  const openedAt = Number(body.openedAt);
  if (!Number.isFinite(openedAt) || Date.now() - openedAt < MIN_FILL_MS) {
    return fail(400, "That was too quick — please try again.");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return fail(422, "Please enter your name.", "name");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 160) {
    return fail(422, "Please enter a valid email address.", "email");
  }

  const start = typeof body.start === "string" ? body.start : "";
  if (!start || !isOfferedSlot(start)) {
    return fail(422, "That time is no longer available.", "start");
  }
  const existing = await store.get(start);
  if (existing) {
    // The same person submitting twice is a double-click, not a clash.
    if (existing.email.toLowerCase() === email.toLowerCase()) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        start,
        reference: existing.id,
        visitorConfirmed: true,
      });
    }
    return fail(409, "That time has just been taken.", "start");
  }

  const service =
    typeof body.service === "string" && body.service !== "" ? body.service : undefined;
  if (service && !SERVICE_OPTIONS.includes(service)) {
    return fail(422, "Unknown service.", "service");
  }

  const timezone = typeof body.timezone === "string" ? body.timezone : "";
  if (!timezone || !validTimezone(timezone)) {
    return fail(422, "Unknown timezone.", "timezone");
  }

  const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : "";

  if (!deliveryConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Booking is not connected yet. Please email hello@loomiestudio.com and we will confirm by return.",
        unconfigured: true,
      },
      { status: 503 }
    );
  }

  const booking = {
    id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    start,
    name,
    email,
    service,
    note: note || undefined,
    timezone,
    createdAt: Date.now(),
  };

  // Claim before sending. Claiming after would leave a window in which two
  // people are both emailed a confirmation for the same slot.
  if (!(await store.claim(booking))) {
    return fail(409, "That time has just been taken.", "start");
  }

  const delivery = await deliver(booking);

  if (!delivery.studioNotified) {
    // Nobody at the studio knows about this, so it is not a booking. The slot
    // goes back rather than being silently held by a failed submission.
    await store.release(start);
    return NextResponse.json(
      {
        ok: false,
        error:
          "We could not reach the studio just now. Please email hello@loomiestudio.com and we will confirm by return.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    start,
    reference: booking.id,
    durationMinutes: CALL_MINUTES,
    studioTimezone: STUDIO_TIMEZONE,
    // The interface says "a confirmation has been sent" only when one was.
    visitorConfirmed: delivery.visitorConfirmed,
    persisted: store.durable,
  });
}
