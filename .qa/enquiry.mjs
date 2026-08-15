/**
 * The enquiry route: validation, refusal, and the row that has to land.
 *
 * Same shape as the booking suite — a stub for Resend so a send can be
 * observed rather than asserted, and the PostgREST stub over the real Postgres
 * so the row is written by the real client against the real constraints.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";
import pg from "pg";

const ROOT = "/home/user/loomieTeam";
const DB = process.env.SUPABASE_DB_URL;
if (!DB) {
  console.error("SUPABASE_DB_URL is required.");
  process.exit(1);
}

const rest = await startPostgrestStub(3396, DB);
await rest.reset();

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

const sent = [];
let failSend = false;
const MAIL_PORT = 3397;
const mail = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (failSend) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "stubbed failure" }));
      return;
    }
    sent.push(JSON.parse(body || "{}"));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${sent.length}` }));
  });
});
await new Promise((r) => mail.listen(MAIL_PORT, r));

async function withServer(port, env, run) {
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i += 1) {
    await sleep(400);
    try {
      if ((await fetch(`${base}/api/availability`)).ok) break;
    } catch {
      /* not up */
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

let caller = 0;
const post = (base, body, headers = {}) => {
  caller += 1;
  return fetch(`${base}/api/enquiry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `203.0.113.${caller % 250}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
};

const valid = (over = {}) => ({
  name: "Ada Lovelace",
  email: "ada@example.com",
  company: "Analytical Engines",
  service: "logo-design",
  message: "We are rebranding a small practice and need a mark that survives print.",
  website: "",
  openedAt: Date.now() - 8000,
  ...over,
});

const DURABLE = {
  NEXT_PUBLIC_SUPABASE_URL: rest.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
  SUPABASE_SECRET_KEY: "stub-secret",
  RESEND_API_KEY: "re_stub",
  BOOKING_FROM_EMAIL: "bookings@example.com",
  BOOKING_TO_EMAIL: "studio@example.com",
  RESEND_API_URL: `http://localhost:${MAIL_PORT}/emails`,
};

/* ── 1. The enquiry that works ───────────────────────────────────────────── */

console.log("\n1. A written enquiry");
await withServer(3316, DURABLE, async (base) => {
  const response = await post(base, valid());
  const body = await response.json();

  check("200", response.status === 200, `status=${response.status}`);
  check("ok", body.ok === true, JSON.stringify(body).slice(0, 140));
  check("reports that this message was stored", body.persisted === true, String(body.persisted));
  check("and that the studio was notified", body.notified === true, String(body.notified));
  check("one email was sent", sent.length === 1, `sent=${sent.length}`);
  /**
   * Addressed by the `booking_email` setting, not by BOOKING_TO_EMAIL.
   *
   * That field used to be an admin control nothing read. The setting now wins
   * and the environment variable is the fallback, which is what makes editing
   * it in the admin mean anything.
   */
  const configured = (
    await db.query("select value from site_settings where key = 'booking_email'")
  ).rows[0]?.value;

  check(
    "addressed by the booking_email setting",
    sent[0]?.to?.[0] === configured,
    `${JSON.stringify(sent[0]?.to)} vs setting ${configured}`
  );
  check(
    "replying goes to the enquirer",
    sent[0]?.reply_to === "ada@example.com",
    String(sent[0]?.reply_to)
  );
  check(
    "no receipt is sent to the enquirer",
    !sent.some((m) => m.to?.includes("ada@example.com")),
    "an unexpected receipt was sent"
  );
  check("the message body is carried", sent[0]?.html.includes("survives print"), "message missing");

  const { rows } = await db.query(
    `select e.name, e.email, e.company, e.message, e.status, s.slug as service_slug
       from enquiries e left join services s on s.id = e.service_id
      where e.email = $1`,
    ["ada@example.com"]
  );
  const row = rows[0];
  check("the row exists", Boolean(row), "no enquiry row");
  check("with the name", row?.name === "Ada Lovelace", String(row?.name));
  check("with the company", row?.company === "Analytical Engines", String(row?.company));
  check("joined to the chosen service", row?.service_slug === "logo-design", String(row?.service_slug));
  check("starts as new", row?.status === "new", String(row?.status));
  check("the whole message is stored", row?.message.includes("survives print"), "message truncated");
});

/* ── 1b. With no setting, the environment variable is used ───────────────── */

console.log("\n1b. Falling back to BOOKING_TO_EMAIL");
{
  const previous = (
    await db.query("select value from site_settings where key = 'booking_email'")
  ).rows[0]?.value;

  await db.query("update site_settings set value = null where key = 'booking_email'");

  await withServer(3323, DURABLE, async (base) => {
    const before = sent.length;
    await post(base, valid({ email: "fallback@example.com" }));
    check(
      "an unset setting falls back to the environment variable",
      sent[before]?.to?.[0] === "studio@example.com",
      JSON.stringify(sent[before]?.to)
    );
  });

  await db.query("update site_settings set value = $1 where key = 'booking_email'", [previous]);
}

/* ── 2. Validation ───────────────────────────────────────────────────────── */

console.log("\n2. Validation");
await withServer(3317, DURABLE, async (base) => {
  const cases = [
    ["honeypot filled", valid({ website: "http://spam.example" }), 400],
    ["submitted too fast", valid({ openedAt: Date.now() }), 400],
    ["missing openedAt", valid({ openedAt: undefined }), 400],
    ["name too short", valid({ name: "A" }), 422],
    ["malformed email", valid({ email: "ada@example" }), 422],
    ["message too short", valid({ message: "hi" }), 422],
    ["unknown service", valid({ service: "skywriting" }), 422],
  ];

  for (const [label, payload, expected] of cases) {
    const response = await post(base, payload);
    check(`${label} -> ${expected}`, response.status === expected, `got ${response.status}`);
  }

  const cross = await post(base, valid(), { Origin: "https://evil.example" });
  check("cross-origin -> 403", cross.status === 403, `got ${cross.status}`);
});

/* ── 3. A message too long is refused, not cut down ──────────────────────── */

console.log("\n3. An oversized message");
await withServer(3319, DURABLE, async (base) => {
  const before = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;

  const response = await post(base, valid({ email: "long@example.com", message: "x".repeat(4001) }));
  const body = await response.json();
  check("422", response.status === 422, `got ${response.status}`);
  check("blamed on the message field", body.field === "message", JSON.stringify(body).slice(0, 120));

  const after = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;
  check("nothing was written", after === before, `${before} -> ${after}`);
});

/* ── 4. The studio's email fails, but the message is kept ────────────────── */
//
// The order used to be notify-then-store with the insert in a try/catch, and
// the response said persisted:true because that field described the store's
// durability rather than this message. A visitor could be told their enquiry
// was recorded when it had not been.
//
// Now the row goes in first. A send failure is not a failed enquiry — the
// message is somewhere an administrator will see it — so the visitor is told
// it arrived and told that the notification did not.

console.log("\n4. The studio's email fails");
await withServer(3320, DURABLE, async (base) => {
  failSend = true;
  const before = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;

  const response = await post(base, valid({ email: "unreachable@example.com" }));
  const body = await response.json();

  check("still a success, because the message was kept", response.status === 200,
    `got ${response.status}`);
  check("ok is true", body.ok === true, JSON.stringify(body).slice(0, 120));
  check("persisted is true, and means this message", body.persisted === true,
    String(body.persisted));
  check("notified is false, and says so", body.notified === false, String(body.notified));

  const after = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;
  check("the row is there for somebody to answer", after === before + 1, `${before} -> ${after}`);
  failSend = false;
});

/* ── 4b. The database refuses, so nothing is claimed ─────────────────────── */
//
// The other half of the same rule: if the row cannot be written, the visitor
// must not be told their message was recorded.

console.log("\n4b. The message cannot be stored");
await withServer(3322, DURABLE, async (base) => {
  const before = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;

  // A message longer than the column will take is refused by the database
  // rather than by validation, which is exactly the failure being tested.
  await db.query("alter table enquiries add constraint enquiries_qa_block check (email <> 'blocked@example.com')");

  try {
    const response = await post(base, valid({ email: "blocked@example.com" }));
    const body = await response.json();

    check("503 rather than a false success", response.status === 503, `got ${response.status}`);
    check("ok is false", body.ok === false, JSON.stringify(body).slice(0, 140));
    check("and it does not claim to have persisted anything",
      body.persisted !== true, JSON.stringify(body).slice(0, 140));
    check("points the visitor at email", /email/i.test(body.error ?? ""), body.error);

    const after = (await db.query("select count(*)::int as n from enquiries")).rows[0].n;
    check("nothing was written", after === before, `${before} -> ${after}`);
  } finally {
    await db.query("alter table enquiries drop constraint enquiries_qa_block");
  }
});

/* ── 5. Production with no durable store ─────────────────────────────────── */

console.log("\n5. Production with no durable store configured");
await withServer(
  3321,
  {
    NEXT_PUBLIC_SUPABASE_URL: "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SUPABASE_SECRET_KEY: "",
    RESEND_API_KEY: "re_stub",
    BOOKING_FROM_EMAIL: "bookings@example.com",
    BOOKING_TO_EMAIL: "studio@example.com",
    RESEND_API_URL: `http://localhost:${MAIL_PORT}/emails`,
  },
  async (base) => {
    const response = await post(base, valid({ email: "nowhere@example.com" }));
    const body = await response.json();
    check("503 rather than a message into nothing", response.status === 503, `got ${response.status}`);
    check("flagged as unconfigured", body.unconfigured === true, JSON.stringify(body).slice(0, 120));
    check("points the visitor at email", /email/i.test(body.error ?? ""), body.error);
  }
);

await rest.reset();
await rest.close();
await db.end();
await new Promise((r) => mail.close(r));
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
