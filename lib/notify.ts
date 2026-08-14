import { CALL_MINUTES, STUDIO_TIMEZONE } from "./availability";
import type { Booking } from "./bookingStore";

/**
 * Booking email, over Resend's REST API.
 *
 * Two messages: one to the studio so somebody knows to turn up, and one to
 * the visitor so they have it in writing. They are reported separately,
 * because the success message the visitor sees has to describe what actually
 * happened rather than what was intended — telling someone a confirmation is
 * on its way when nothing was sent is the failure this file exists to remove.
 */

export interface DeliveryResult {
  /** The studio was told. Without this the booking has not really happened. */
  studioNotified: boolean;
  /** The visitor has it in writing. */
  visitorConfirmed: boolean;
  error?: string;
}

const format = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const escape = (value: string) =>
  value.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);

/**
 * Where the mail goes.
 *
 * Overridable for two reasons: a self-hosted Resend-compatible relay, and
 * being able to prove the success path actually works rather than asserting
 * it. Unset — which is every real deployment — it is Resend itself.
 */
const ENDPOINT =
  process.env.RESEND_API_URL || "https://api.resend.com/emails";

async function send(payload: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      reply_to: payload.replyTo,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 200)}`);
  }
}

/** True when the studio has enough configuration to send anything at all. */
export function deliveryConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.BOOKING_FROM_EMAIL &&
      process.env.BOOKING_TO_EMAIL
  );
}

export async function deliver(booking: Booking): Promise<DeliveryResult> {
  const from = process.env.BOOKING_FROM_EMAIL!;
  const studio = process.env.BOOKING_TO_EMAIL!;

  const studioTime = format(booking.start, STUDIO_TIMEZONE);
  const visitorTime = format(booking.start, booking.timezone);

  const result: DeliveryResult = {
    studioNotified: false,
    visitorConfirmed: false,
  };

  try {
    await send({
      from,
      to: studio,
      // So a reply from the studio goes to the person who booked.
      replyTo: booking.email,
      subject: `Intro call — ${booking.name} — ${studioTime}`,
      html: `
        <p><strong>${escape(booking.name)}</strong> booked a ${CALL_MINUTES}-minute intro call.</p>
        <table cellpadding="4">
          <tr><td>Studio time</td><td>${escape(studioTime)} (${escape(STUDIO_TIMEZONE)})</td></tr>
          <tr><td>Their time</td><td>${escape(visitorTime)} (${escape(booking.timezone)})</td></tr>
          <tr><td>Email</td><td>${escape(booking.email)}</td></tr>
          <tr><td>Service</td><td>${escape(booking.serviceTitle ?? "Not specified")}</td></tr>
          <tr><td>Note</td><td>${escape(booking.note ?? "—")}</td></tr>
          <tr><td>Reference</td><td>${escape(booking.id)}</td></tr>
        </table>`,
    });
    result.studioNotified = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    // The studio has not been told, so there is no booking to confirm.
    return result;
  }

  try {
    await send({
      from,
      to: booking.email,
      replyTo: studio,
      subject: `Your intro call with Loomie — ${visitorTime}`,
      html: `
        <p>Thanks ${escape(booking.name)} — your ${CALL_MINUTES}-minute intro call is booked.</p>
        <p><strong>${escape(visitorTime)}</strong><br>${escape(booking.timezone)}</p>
        <p>Need to move it or cancel? Reply to this email and we will sort it out.</p>
        <p>Reference ${escape(booking.id)}</p>`,
    });
    result.visitorConfirmed = true;
  } catch (error) {
    // The studio knows, so the booking stands even though the receipt failed.
    result.error = error instanceof Error ? error.message : "Unknown error";
  }

  return result;
}

/* ── Enquiries ───────────────────────────────────────────────────────────── */

export interface EnquiryMessage {
  name: string;
  email: string;
  company?: string;
  serviceTitle?: string;
  message: string;
}

/**
 * Tells the studio about a written enquiry.
 *
 * One email, not two. A booking sends a receipt because the visitor is being
 * held to a time and needs it in writing; an enquiry is a message, and a robot
 * replying "we got your message" to a message is noise. The interface confirms
 * on screen instead, which is where the person already is.
 *
 * Returns whether it actually sent. The route refuses rather than claiming an
 * enquiry was received by somebody who has not been told about it.
 */
export async function notifyEnquiry(enquiry: EnquiryMessage): Promise<boolean> {
  const from = process.env.BOOKING_FROM_EMAIL;
  const studio = process.env.BOOKING_TO_EMAIL;
  if (!process.env.RESEND_API_KEY || !from || !studio) return false;

  try {
    await send({
      from,
      to: studio,
      replyTo: enquiry.email,
      subject: `Enquiry — ${enquiry.name}`,
      html: `
        <p><strong>${escape(enquiry.name)}</strong> sent an enquiry.</p>
        <table cellpadding="4">
          <tr><td>Email</td><td>${escape(enquiry.email)}</td></tr>
          <tr><td>Company</td><td>${escape(enquiry.company ?? "—")}</td></tr>
          <tr><td>Service</td><td>${escape(enquiry.serviceTitle ?? "Not specified")}</td></tr>
        </table>
        <p style="white-space:pre-wrap">${escape(enquiry.message)}</p>`,
    });
    return true;
  } catch {
    return false;
  }
}
