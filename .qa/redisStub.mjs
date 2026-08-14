import { createServer } from "node:http";

/**
 * A local stand-in for Upstash's REST API.
 *
 * The route now refuses to accept bookings in production unless a durable
 * store is configured, which is the correct behaviour and makes the memory
 * adapter untestable under `next start`. Rather than weaken the rule for the
 * suite, this speaks the handful of commands lib/bookingStore.ts actually
 * sends — so the tests exercise the redis adapter and the production code
 * path, which the previous suite never touched at all.
 */
export function startRedisStub(port) {
  const strings = new Map();
  const sets = new Map();
  const expiries = new Map();

  const alive = (key) => {
    const at = expiries.get(key);
    if (at !== undefined && Date.now() > at) {
      strings.delete(key);
      expiries.delete(key);
      return false;
    }
    return true;
  };

  const run = ([command, ...args]) => {
    const name = String(command).toUpperCase();
    const key = args[0];

    switch (name) {
      case "GET":
        return alive(key) && strings.has(key) ? strings.get(key) : null;

      case "SET": {
        const value = args[1];
        const nx = args.slice(2).some((a) => String(a).toUpperCase() === "NX");
        if (nx && alive(key) && strings.has(key)) return null;
        strings.set(key, value);
        return "OK";
      }

      case "DEL": {
        const had = strings.delete(key);
        expiries.delete(key);
        return had ? 1 : 0;
      }

      case "SADD": {
        const set = sets.get(key) ?? new Set();
        const before = set.size;
        set.add(args[1]);
        sets.set(key, set);
        return set.size - before;
      }

      case "SREM": {
        const set = sets.get(key);
        if (!set) return 0;
        return set.delete(args[1]) ? 1 : 0;
      }

      case "SMEMBERS":
        return [...(sets.get(key) ?? [])];

      case "INCR": {
        alive(key);
        const next = Number(strings.get(key) ?? 0) + 1;
        strings.set(key, String(next));
        return next;
      }

      case "PEXPIRE":
        expiries.set(key, Date.now() + Number(args[1]));
        return 1;

      default:
        throw new Error(`redis stub: unhandled command ${name}`);
    }
  };

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const result = run(JSON.parse(body));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ result }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () =>
      resolve({
        url: `http://localhost:${port}`,
        close: () => server.close(),
        reset: () => {
          strings.clear();
          sets.clear();
          expiries.clear();
        },
        peek: (key) => strings.get(key),
      })
    );
  });
}
