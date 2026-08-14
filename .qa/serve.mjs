/** Starts a production server against the stub and holds it open. */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";
import { writeFileSync } from "node:fs";

const rest = await startPostgrestStub(3394, process.env.SUPABASE_DB_URL);
const port = process.env.PORT ?? "3210";

const child = spawn("npx", ["next", "start", "-p", port], {
  cwd: "/home/user/loomieTeam",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: rest.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable",
    SUPABASE_SECRET_KEY: rest.serviceKey,
    NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
  },
  stdio: ["ignore", "inherit", "inherit"],
  detached: true,
});

writeFileSync("/tmp/qa-server.pid", String(child.pid));

for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`http://localhost:${port}/api/availability`)).ok) break;
  } catch { /* not up */ }
}
console.log("ready on", port);

process.on("SIGTERM", async () => {
  try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); }
  await rest.close();
  process.exit(0);
});

await new Promise(() => {});
