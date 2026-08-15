/**
 * The PostgREST stub plus a production server, in one foreground process.
 *
 * Foreground on purpose: a detached child that outlives its wrapper is how the
 * previous runs ended up with three servers holding ports and tests talking to
 * a build from twenty minutes ago.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { startPostgrestStub } from "./postgrestStub.mjs";

const port = process.env.PORT ?? "3230";
/**
 * Both ports come from the environment.
 *
 * A killed server can leave its socket in TIME_WAIT for a minute, and a
 * hardcoded stub port then makes every restart in that window fail with
 * EADDRINUSE — which looks like a bug in whatever is being tested.
 */
const stubPort = Number(process.env.STUB_PORT ?? 3394);
const rest = await startPostgrestStub(stubPort, process.env.SUPABASE_DB_URL);

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
});

for (let i = 0; i < 60; i += 1) {
  await sleep(400);
  try {
    if ((await fetch(`http://localhost:${port}/api/availability`)).ok) break;
  } catch { /* not up */ }
}
console.log(`READY on ${port}`);

const shutdown = async () => {
  child.kill("SIGKILL");
  await rest.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
await new Promise((resolve) => child.on("exit", resolve));
await rest.close();
