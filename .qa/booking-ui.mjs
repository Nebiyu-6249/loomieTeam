/**
 * The booking panel, driven by a real keyboard and mouse against a real
 * server, so the message the visitor is shown can be compared with what
 * actually happened rather than with what the code intends.
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as sleep } from "node:timers/promises";
import { startRedisStub } from "./redisStub.mjs";

/** Production refuses a booking without durable storage, so give it one. */
const redis = await startRedisStub(3394);
const MAIL_PORT = 3398;
const APP_PORT = 3316;

let passed = 0;
let failed = 0;
const check = (label, ok, detail = "") => {
  if (ok) passed += 1;
  else {
    failed += 1;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
  if (ok) console.log(`  PASS  ${label}`);
};

const sent = [];
let failFor = null;
const mail = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const payload = JSON.parse(body || "{}");
    if (failFor && (payload.to ?? []).join(",").includes(failFor)) {
      res.writeHead(500).end(JSON.stringify({ message: "stub failure" }));
      return;
    }
    sent.push(payload);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ id: `stub-${sent.length}` }));
  });
});
await new Promise((r) => mail.listen(MAIL_PORT, r));

const app = spawn("npx", ["next", "start", "-p", String(APP_PORT)], {
  cwd: "/home/user/loomieTeam",
  env: {
    ...process.env,
    RESEND_API_KEY: "re_stub",
    BOOKING_FROM_EMAIL: "bookings@example.com",
    BOOKING_TO_EMAIL: "studio@example.com",
    RESEND_API_URL: `http://localhost:${MAIL_PORT}/emails`,
    UPSTASH_REDIS_REST_URL: redis.url,
    UPSTASH_REDIS_REST_TOKEN: "stub",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const BASE = `http://localhost:${APP_PORT}`;
for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`${BASE}/api/availability`)).ok) break;
  } catch {
    /* waiting */
  }
}

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-dev-shm-usage"],
});

async function book(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);

  // The minimum fill time is three seconds, and the form means it.
  await page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first().click();
  await page.locator('input[name="name"]').fill("Ada Lovelace");
  await page.locator('input[name="email"]').fill(email);
  await page.waitForTimeout(3400);
  await page.getByRole("button", { name: /confirm/i }).click();
  await page.waitForTimeout(2500);

  const text = await page.locator("main").innerText();
  await context.close();
  return text;
}

try {
  console.log("\n1. A booking that succeeds");
  const success = await book("ada@example.com");
  check("says the visitor is booked", /You're booked\./.test(success), success.slice(0, 200));
  check(
    "claims a confirmation only because one was sent",
    /A confirmation has been sent to your email\./.test(success) && sent.length === 2,
    `sent=${sent.length}`
  );
  check("shows a reference", /Ref [A-Z0-9]{8}/i.test(success), success.match(/Ref .*/i)?.[0] ?? "none");

  console.log("\n2. Studio told, visitor's receipt fails");
  failFor = "grace@example.com";
  const partial = await book("grace@example.com");
  check("does not say 'You're booked'", !/You're booked\./.test(partial), partial.slice(0, 200));
  check("says the request was received", /Request received\./.test(partial), partial.slice(0, 200));
  check(
    "does not claim a confirmation was sent",
    !/A confirmation has been sent/.test(partial) &&
      /confirm the time by email/.test(partial),
    partial.slice(0, 300)
  );

  console.log("\n3. Nothing configured at all");
  // A second server with no provider, to see what the panel tells a visitor.
  const bare = spawn("npx", ["next", "start", "-p", "3317"], {
    cwd: "/home/user/loomieTeam",
    env: { ...process.env, RESEND_API_KEY: "", BOOKING_FROM_EMAIL: "", BOOKING_TO_EMAIL: "" },
    stdio: ["ignore", "pipe", "pipe"],
    // Its own process group, so the whole tree dies with one signal. Killing
    // the npx wrapper alone leaves next-server holding the port, and the next
    // run then talks to this run's server without noticing.
    detached: true,
  });
  for (let i = 0; i < 60; i += 1) {
    await sleep(400);
    try {
      if ((await fetch("http://localhost:3317/api/availability")).ok) break;
    } catch {
      /* waiting */
    }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3317/contact", { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first().click();
  await page.locator('input[name="name"]').fill("Ada Lovelace");
  await page.locator('input[name="email"]').fill("ada@example.com");
  await page.waitForTimeout(3400);
  await page.getByRole("button", { name: /confirm/i }).click();
  await page.waitForTimeout(2000);

  const unconfigured = await page.locator("main").innerText();
  check("no success state at all", !/You're booked|Request received/.test(unconfigured), unconfigured.slice(0, 200));
  check(
    "tells the visitor to email instead",
    /hello@loomiestudio\.com/.test(unconfigured),
    unconfigured.slice(0, 300)
  );
  await context.close();
  try {
    process.kill(-bare.pid, "SIGKILL");
  } catch {
    bare.kill("SIGKILL");
  }
} finally {
  await browser.close();
  try {
    process.kill(-app.pid, "SIGKILL");
  } catch {
    app.kill("SIGKILL");
  }
  mail.close();
  redis.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
