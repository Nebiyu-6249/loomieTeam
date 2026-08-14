/**
 * The booking API, exercised end to end against a production build.
 *
 * Each block runs against a freshly started server on its own port, because
 * the rate limiter is five requests per ten minutes per address and a single
 * long run would trip it halfway through and report nonsense for everything
 * after.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";

const ROOT = "/home/user/loomieTeam";
const DB = process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error("SUPABASE_DB_URL is required: the suite runs against real Postgres.");
  process.exit(1);
}

/**
 * Production refuses to accept a booking unless durable storage is configured,
 * so every block that wants to reach validation runs against a PostgREST-shaped
 * stub over the real local Postgres. The route, lib/bookingStore and
 * supabase-js all run unmodified, and the one guarantee that matters — that two
 * people cannot claim the same slot — is enforced by the real partial unique
 * index rather than by anything in the test.
 */
const rest = await startPostgrestStub(3390, DB);
await rest.reset();

const DURABLE = {
  NEXT_PUBLIC_SUPABASE_URL: rest.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
  SUPABASE_SECRET_KEY: "stub-secret",
};

let passed = 0;
let failed = 0;

function check(label, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
}

async function withServer(port, env, run) {
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group, so the whole tree dies with one signal. Killing
    // the npx wrapper alone leaves next-server holding the port, and the next
    // run then talks to this run's server without noticing.
    detached: true,
  });

  const base = `http://localhost:${port}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(400);
    try {
      const probe = await fetch(`${base}/api/availability`);
      if (probe.ok) break;
    } catch {
      /* not up yet */
    }
  }

  try {
    await run(base);
  } finally {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
    await sleep(900);
  }
}

/**
 * Each call comes from its own address unless the caller pins one.
 *
 * The limiter is five per ten minutes per address and it is checked before
 * validation, so a suite that shared one address would stop testing validation
 * after the fifth case and start testing the limiter by accident. Block 4 pins
 * an address precisely because that is the thing it is measuring.
 */
let caller = 0;
const post = (base, body, headers = {}) => {
  caller += 1;
  return fetch(`${base}/api/booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `198.51.100.${caller % 250}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

/** A payload that would succeed, so each test changes exactly one thing. */
const valid = (start, over = {}) => ({
  start,
  name: "Ada Lovelace",
  email: "ada@example.com",
  service: "identity",
  note: "Rebranding a small practice.",
  timezone: "Europe/London",
  company: "",
  openedAt: Date.now() - 8000,
  ...over,
});

async function slots(base) {
  const response = await fetch(`${base}/api/availability`);
  const body = await response.json();
  return body;
}

/* ── 1. Nothing configured: refuses, and says why ───────────────────────── */

console.log("\n1. No email provider configured");
await withServer(3311, { ...DURABLE, RESEND_API_KEY: "", BOOKING_FROM_EMAIL: "", BOOKING_TO_EMAIL: "" }, async (base) => {
  const availability = await slots(base);
  check("availability returns slots", availability.slots?.length > 0, JSON.stringify(availability).slice(0, 120));
  check("availability reports persistence honestly", availability.persisted === true, `persisted=${availability.persisted}`);

  const response = await post(base, valid(availability.slots[0].start));
  const body = await response.json();
  check("503 rather than a fake success", response.status === 503, `status=${response.status}`);
  check("ok is false", body.ok === false, JSON.stringify(body).slice(0, 120));
  check("flagged as unconfigured", body.unconfigured === true, JSON.stringify(body).slice(0, 120));
  check("tells the visitor what to do instead", /email/i.test(body.error ?? ""), body.error);
});

/* ── 2. Validation, all of which must fail before any email is attempted ── */

console.log("\n2. Validation (still unconfigured, so nothing can be sent)");
await withServer(3312, { ...DURABLE, RESEND_API_KEY: "", BOOKING_FROM_EMAIL: "", BOOKING_TO_EMAIL: "" }, async (base) => {
  const availability = await slots(base);
  const start = availability.slots[0].start;

  const cases = [
    ["honeypot filled", valid(start, { company: "Acme" }), 400],
    ["submitted too fast", valid(start, { openedAt: Date.now() }), 400],
    ["missing openedAt", valid(start, { openedAt: undefined }), 400],
    ["name too short", valid(start, { name: "A" }), 422],
    ["name too long", valid(start, { name: "A".repeat(81) }), 422],
    ["malformed email", valid(start, { email: "ada@example" }), 422],
    ["slot not offered", valid("2020-01-01T09:00:00.000Z"), 422],
    ["slot not a string", valid(start, { start: 12345 }), 422],
    ["unknown service", valid(start, { service: "skywriting" }), 422],
    ["unknown timezone", valid(start, { timezone: "Mars/Olympus" }), 422],
    ["missing timezone", valid(start, { timezone: "" }), 422],
  ];

  for (const [label, payload, expected] of cases) {
    const response = await post(base, payload);
    const body = await response.json().catch(() => ({}));
    check(`${label} -> ${expected}`, response.status === expected, `got ${response.status} ${JSON.stringify(body).slice(0, 90)}`);
  }

  // Malformed JSON never reaches validation.
  const malformed = await fetch(`${base}/api/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.77" },
    body: "{not json",
  });
  check("malformed body -> 400", malformed.status === 400, `got ${malformed.status}`);

  // Cross-origin is refused before anything else happens.
  const crossOrigin = await post(base, valid(start), { Origin: "https://evil.example" });
  check("cross-origin -> 403", crossOrigin.status === 403, `got ${crossOrigin.status}`);

  // An oversized note is refused rather than quietly cut down.
  const oversize = await post(base, valid(start, { note: "x".repeat(5000) }));
  const oversizeBody = await oversize.json().catch(() => ({}));
  check("oversized note -> 422", oversize.status === 422, `got ${oversize.status}`);
  check("  blamed on the note field", oversizeBody.field === "note", JSON.stringify(oversizeBody).slice(0, 90));

  // A body far past the ceiling is refused before it is parsed.
  const huge = await fetch(`${base}/api/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.91" },
    body: JSON.stringify({ ...valid(start), note: "x".repeat(200000) }),
  });
  check("oversized body -> 413", huge.status === 413, `got ${huge.status}`);
});

/* ── 3. Provider configured but failing: no booking, slot handed back ───── */

console.log("\n3. Email provider configured but rejecting");
await withServer(
  3313,
  {
    ...DURABLE,
    RESEND_API_KEY: "re_invalid_key_for_testing",
    BOOKING_FROM_EMAIL: "bookings@example.com",
    BOOKING_TO_EMAIL: "studio@example.com",
  },
  async (base) => {
    const availability = await slots(base);
    const start = availability.slots[0].start;

    const response = await post(base, valid(start));
    const body = await response.json();
    check("502 when the studio cannot be reached", response.status === 502, `status=${response.status}`);
    check("ok is false", body.ok === false, JSON.stringify(body).slice(0, 120));
    check("points the visitor at email", /email/i.test(body.error ?? ""), body.error);

    // The slot must be released, or a failed send would silently hold it.
    const after = await slots(base);
    const stillOffered = after.slots.some((slot) => slot.start === start);
    check("failed booking released the slot", stillOffered, `slot ${start} missing from availability`);
  }
);

/* ── 4. Rate limiting ───────────────────────────────────────────────────── */

console.log("\n4. Rate limit (5 per 10 minutes)");
await withServer(3314, { ...DURABLE, RESEND_API_KEY: "", BOOKING_FROM_EMAIL: "", BOOKING_TO_EMAIL: "" }, async (base) => {
  const availability = await slots(base);
  const start = availability.slots[0].start;

  const statuses = [];
  for (let i = 0; i < 7; i += 1) {
    const response = await post(base, valid(start), { "X-Forwarded-For": "192.0.2.11" });
    statuses.push(response.status);
  }
  check(
    "first five get through, the sixth is limited",
    statuses.slice(0, 5).every((s) => s !== 429) && statuses[5] === 429,
    statuses.join(",")
  );

  // A different address is unaffected.
  const other = await post(base, valid(start), { "X-Forwarded-For": "192.0.2.12" });
  check("a different address is not limited", other.status !== 429, `got ${other.status}`);
});

/* ── 5. Production without durable storage ──────────────────────────────── */

console.log("\n5. Production with no durable store configured");
await withServer(
  3318,
  {
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
    RESEND_API_KEY: "re_stub",
    BOOKING_FROM_EMAIL: "bookings@example.com",
    BOOKING_TO_EMAIL: "studio@example.com",
  },
  async (base) => {
    const availability = await slots(base);
    check("times are still shown", availability.slots?.length > 0);
    check("but persistence is reported as false", availability.persisted === false, `persisted=${availability.persisted}`);

    const response = await post(base, valid(availability.slots[0].start));
    const body = await response.json();
    check("503 rather than a booking into process memory", response.status === 503, `status=${response.status}`);
    check("ok is false", body.ok === false, JSON.stringify(body).slice(0, 120));
    check("points the visitor at email", /email/i.test(body.error ?? ""), body.error);
  }
);

await rest.reset();
await rest.close();
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
