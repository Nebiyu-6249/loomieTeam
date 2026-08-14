/**
 * The paths that need a working mail provider: the successful booking, the
 * double-click, the clash, and the case where only the visitor's receipt
 * fails. A stub stands in for Resend so all four can actually be observed
 * rather than asserted.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";
import pg from "pg";

const ROOT = "/home/user/loomieTeam";
const DB = process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error("SUPABASE_DB_URL is required: the suite runs against real Postgres.");
  process.exit(1);
}

/** Production refuses a booking without durable storage, so give it one. */
const rest = await startPostgrestStub(3393, DB);
await rest.reset();
const MAIL_PORT = 3399;

/** A direct connection, to read back what actually landed in the table. */
const db = new pg.Client({ connectionString: DB });
await db.connect();

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
};

/** Every message the stub was asked to send, and a switch to make it fail. */
const sent = [];
let failFor = null; // a substring of the "to" address that should 500

const mail = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const payload = JSON.parse(body || "{}");
    const to = (payload.to ?? []).join(",");
    if (failFor && to.includes(failFor)) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "stubbed failure" }));
      return;
    }
    sent.push(payload);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${sent.length}` }));
  });
});
await new Promise((resolve) => mail.listen(MAIL_PORT, resolve));

const child = spawn("npx", ["next", "start", "-p", "3315"], {
  cwd: ROOT,
  env: {
    ...process.env,
    RESEND_API_KEY: "re_stub",
    BOOKING_FROM_EMAIL: "bookings@example.com",
    BOOKING_TO_EMAIL: "studio@example.com",
    RESEND_API_URL: `http://localhost:${MAIL_PORT}/emails`,
    NEXT_PUBLIC_SUPABASE_URL: rest.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
    SUPABASE_SECRET_KEY: "stub-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

const base = "http://localhost:3315";
for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`${base}/api/availability`)).ok) break;
  } catch {
    /* not up */
  }
}

let caller = 0;
const post = (body, headers = {}) => {
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

const availability = async () => (await fetch(`${base}/api/availability`)).json();

try {
  const before = await availability();
  const slotCount = before.slots.length;
  const start = before.slots[0].start;

  /* ── 1. The booking that works ────────────────────────────────────────── */
  console.log("\n1. Successful booking");
  const first = await post(valid(start));
  const body = await first.json();

  check("200", first.status === 200, `status=${first.status}`);
  check("ok", body.ok === true, JSON.stringify(body).slice(0, 140));
  check(
    "carries a readable reference",
    typeof body.reference === "string" && /^LM-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(body.reference),
    body.reference
  );
  check("reports the duration", body.durationMinutes > 0, String(body.durationMinutes));
  check("confirms the visitor was emailed", body.visitorConfirmed === true, String(body.visitorConfirmed));
  check("reports persistence honestly", body.persisted === true, String(body.persisted));
  check("two emails were actually sent", sent.length === 2, `sent=${sent.length}`);
  check(
    "one to the studio, one to the visitor",
    sent[0]?.to?.[0] === "studio@example.com" && sent[1]?.to?.[0] === "ada@example.com",
    JSON.stringify(sent.map((m) => m.to))
  );
  check(
    "studio mail replies to the visitor",
    sent[0]?.reply_to === "ada@example.com",
    String(sent[0]?.reply_to)
  );
  check(
    "the reference appears in both",
    sent.every((m) => m.html.includes(body.reference)),
    body.reference
  );
  check(
    "the note is carried to the studio",
    sent[0]?.html.includes("Rebranding a small practice."),
    "note missing"
  );

  /* ── 1b. And it is a row in the database ──────────────────────────────── */
  console.log("\n1b. The booking is a row somebody can open");
  const stored = await db.query(
    `select b.booking_code, b.name, b.email, b.status, b.studio_notified,
            b.visitor_confirmed, b.start_at, b.end_at, b.note, b.visitor_timezone,
            s.slug as service_slug
       from bookings b left join services s on s.id = b.service_id
      where b.booking_code = $1`,
    [body.reference]
  );
  const row = stored.rows[0];
  check("the row exists", Boolean(row), `no row for ${body.reference}`);
  check("with the visitor's name and address", row?.name === "Ada Lovelace" && row?.email === "ada@example.com", JSON.stringify(row ?? {}).slice(0, 120));
  check("marked confirmed once the studio was told", row?.status === "confirmed", String(row?.status));
  check("studio_notified recorded", row?.studio_notified === true, String(row?.studio_notified));
  check("visitor_confirmed recorded", row?.visitor_confirmed === true, String(row?.visitor_confirmed));
  check("joined to the chosen service", row?.service_slug === "identity", String(row?.service_slug));
  check("start matches the slot", row && new Date(row.start_at).toISOString() === start, `${row?.start_at} vs ${start}`);
  check("ends after it starts", row && new Date(row.end_at) > new Date(row.start_at), `${row?.end_at}`);
  check("the note is stored", row?.note === "Rebranding a small practice.", String(row?.note));
  check("the visitor's timezone is stored", row?.visitor_timezone === "Europe/London", String(row?.visitor_timezone));

  /* ── 2. The slot is gone ──────────────────────────────────────────────── */
  console.log("\n2. The slot leaves availability");
  const after = await availability();
  check("one fewer slot offered", after.slots.length === slotCount - 1, `${after.slots.length} vs ${slotCount}`);
  check("that exact slot is gone", !after.slots.some((s) => s.start === start), start);

  /* ── 3. The same person submitting twice ──────────────────────────────── */
  console.log("\n3. Double submission by the same person");
  const mailsBefore = sent.length;
  const again = await post(valid(start));
  const againBody = await again.json();
  check("200, not a clash", again.status === 200, `status=${again.status}`);
  check("flagged as a duplicate", againBody.duplicate === true, JSON.stringify(againBody).slice(0, 140));
  check("same reference returned", againBody.reference === body.reference, `${againBody.reference} vs ${body.reference}`);
  check("no second pair of emails", sent.length === mailsBefore, `sent=${sent.length}`);

  /* ── 4. Somebody else wanting the same slot ───────────────────────────── */
  console.log("\n4. A different person, same slot");
  const clash = await post(valid(start, { name: "Grace Hopper", email: "grace@example.com" }));
  const clashBody = await clash.json();
  check("409", clash.status === 409, `status=${clash.status}`);
  check("ok is false", clashBody.ok === false, JSON.stringify(clashBody).slice(0, 140));
  check("blames the slot field", clashBody.field === "start", String(clashBody.field));

  /* ── 5. Studio mail lands, visitor receipt does not ───────────────────── */
  console.log("\n5. Visitor receipt fails, studio mail lands");
  failFor = "grace@example.com";
  const nextSlot = (await availability()).slots[0].start;
  const partial = await post(valid(nextSlot, { name: "Grace Hopper", email: "grace@example.com" }));
  const partialBody = await partial.json();
  check("still a booking", partial.status === 200 && partialBody.ok === true, `status=${partial.status}`);
  check(
    "does not claim a confirmation was sent",
    partialBody.visitorConfirmed === false,
    String(partialBody.visitorConfirmed)
  );
  check(
    "the slot stays taken",
    !(await availability()).slots.some((s) => s.start === nextSlot),
    nextSlot
  );

  /* ── 6. The duplicate of a booking whose receipt failed ───────────────── */
  console.log("\n6. Submitting that failed-receipt booking again");
  const repeat = await post(valid(nextSlot, { name: "Grace Hopper", email: "grace@example.com" }));
  const repeatBody = await repeat.json();
  check("recognised as a duplicate", repeatBody.duplicate === true, JSON.stringify(repeatBody).slice(0, 140));
  check("same reference", repeatBody.reference === partialBody.reference, `${repeatBody.reference} vs ${partialBody.reference}`);
  check(
    "still does not claim a confirmation was sent",
    repeatBody.visitorConfirmed === false,
    `visitorConfirmed=${repeatBody.visitorConfirmed}`
  );

  /* ── 7. And the duplicate of one that did confirm ─────────────────────── */
  console.log("\n7. Submitting the successful booking again");
  const repeatOk = await post(valid(start));
  const repeatOkBody = await repeatOk.json();
  check("recognised as a duplicate", repeatOkBody.duplicate === true, JSON.stringify(repeatOkBody).slice(0, 140));
  check(
    "reports the confirmation that really was sent",
    repeatOkBody.visitorConfirmed === true,
    `visitorConfirmed=${repeatOkBody.visitorConfirmed}`
  );
} finally {
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  mail.close();
  await rest.reset();
  await rest.close();
  await db.end();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
