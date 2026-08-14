import { NextResponse } from "next/server";
import { getEnquiryStore, storageAcceptsEnquiries } from "@/lib/enquiries";
import { RATE_LIMIT, callerKey, getRateLimiter } from "@/lib/rateLimit";
import { notifyEnquiry } from "@/lib/notify";
import { getContactEmail, getServices } from "@/lib/content";

/**
 * Accepts a written enquiry, or explains why it did not.
 *
 * Same posture as the booking route, and for the same reason: it refuses when
 * there is nowhere durable to put the message, it refuses when the studio
 * cannot actually be reached, and it never reports success for something that
 * did not happen. The difference is that an enquiry has no slot to claim, so
 * there is nothing to hand back — it is written, then sent, and if the send
 * fails the row goes with it.
 */

export const dynamic = "force-dynamic";

const MIN_FILL_MS = 3000;
const MAX_MESSAGE = 4000;
const MAX_BODY_BYTES = 16 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Payload {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  service?: unknown;
  message?: unknown;
  /** Honeypot. Real people cannot see the field. */
  website?: unknown;
  openedAt?: unknown;
}

const fail = (status: number, error: string, field?: string) =>
  NextResponse.json({ ok: false, error, field }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const host = request.headers.get("host");
    try {
      if (new URL(origin).host !== host) return fail(403, "Cross-origin request refused.");
    } catch {
      return fail(400, "Bad origin.");
    }
  }

  const store = getEnquiryStore();

  // Falls back to the seeded address rather than throwing: the message that
  // says the database is unreachable cannot itself require the database.
  const contact = await getContactEmail();
  const fallback = (message: string) => `${message} Please email ${contact} directly.`;

  if (!storageAcceptsEnquiries(store)) {
    return NextResponse.json(
      { ok: false, error: fallback("Messages are not available just now."), unconfigured: true },
      { status: 503 }
    );
  }

  const limiter = getRateLimiter();
  if ((await limiter.hit(`enquiry:${callerKey(request)}`, RATE_LIMIT.windowMs)) > RATE_LIMIT.max) {
    return fail(429, "Too many requests. Try again shortly.");
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return fail(413, "That request is too large.");
  }

  let body: Payload;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, "That request is too large.");
    body = JSON.parse(raw) as Payload;
  } catch {
    return fail(400, "Malformed request.");
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
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

  const company = typeof body.company === "string" ? body.company.trim() : "";
  if (company.length > 120) {
    return fail(422, "Please shorten the company name.", "company");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < 10) {
    return fail(422, "Please say a little more.", "message");
  }
  // Refused rather than truncated. Silently cutting somebody's last paragraph
  // and reporting success loses the part they cared most about.
  if (message.length > MAX_MESSAGE) {
    return fail(422, `Please keep the message under ${MAX_MESSAGE} characters.`, "message");
  }

  const service =
    typeof body.service === "string" && body.service !== "" ? body.service : undefined;
  const chosen = service ? (await getServices()).find((s) => s.id === service) : undefined;
  if (service && !chosen) return fail(422, "Unknown service.", "service");

  const sent = await notifyEnquiry({
    name,
    email,
    company: company || undefined,
    serviceTitle: chosen?.title,
    message,
  });

  if (!sent) {
    return NextResponse.json(
      { ok: false, error: fallback("We could not reach the studio just now.") },
      { status: 502 }
    );
  }

  // Stored after sending. The studio has the message either way; the row is
  // what makes it trackable, and losing the row is worse than losing neither
  // but better than telling somebody their message arrived when it did not.
  try {
    await store.create({ name, email, company: company || undefined, service, message });
  } catch (error) {
    console.error("[loomie] enquiry stored failed after sending", error);
  }

  return NextResponse.json({ ok: true, persisted: store.durable });
}
