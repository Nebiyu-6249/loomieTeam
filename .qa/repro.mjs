import { startPostgrestStub } from "./postgrestStub.mjs";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const rest = await startPostgrestStub(3390, process.env.SUPABASE_DB_URL);
await rest.reset();

const child = spawn("npx", ["next", "start", "-p", "3341"], {
  cwd: "/home/user/loomieTeam",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: rest.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
    SUPABASE_SECRET_KEY: "stub-secret",
    RESEND_API_KEY: "", BOOKING_FROM_EMAIL: "", BOOKING_TO_EMAIL: "",
  },
  stdio: ["ignore", "inherit", "inherit"],
  detached: true,
});

for (let i = 0; i < 40; i++) {
  await sleep(400);
  try { if ((await fetch("http://localhost:3341/api/availability")).ok) break; } catch {}
}

const av = await (await fetch("http://localhost:3341/api/availability")).json();
console.log("persisted:", av.persisted, "slots:", av.slots.length);

const r = await fetch("http://localhost:3341/api/booking", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.5" },
  body: JSON.stringify({
    start: av.slots[0].start, name: "Ada Lovelace", email: "ada@example.com",
    service: "identity", note: "Hello.", timezone: "Europe/London",
    company: "", openedAt: Date.now() - 8000,
  }),
});
console.log("status:", r.status, "body:", (await r.text()).slice(0, 300));

try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
await rest.close();
