/**
 * Where bookings are kept.
 *
 * Two implementations behind one interface. Which one runs is decided by
 * whether UPSTASH_REDIS_REST_URL is configured, and the API reports it, so
 * nothing has to guess whether the diary survives a restart.
 *
 * Upstash was chosen because it speaks plain HTTPS. A serverless route can
 * talk to it with fetch and no client library, no connection pool and no
 * cold-start penalty — which is the only reason a "durable store" is a small
 * change here rather than an infrastructure project. Any equivalent REST
 * datastore drops into the same interface.
 */

export interface Booking {
  id: string;
  start: string;
  name: string;
  email: string;
  service?: string;
  note?: string;
  timezone: string;
  createdAt: number;
}

export interface BookingStore {
  /** Human-readable, for the API's own honesty about persistence. */
  readonly kind: "redis" | "memory";
  readonly durable: boolean;
  get(start: string): Promise<Booking | null>;
  /** False when the slot was already taken — the caller must not overwrite. */
  claim(booking: Booking): Promise<boolean>;
  taken(): Promise<string[]>;
  /** Hands a slot back when the booking could not be completed. */
  release(start: string): Promise<void>;
  /** Returns the count in the window after recording this hit. */
  hit(key: string, windowMs: number): Promise<number>;
}

const SLOT_KEY = (start: string) => `loomie:slot:${start}`;
const TAKEN_SET = "loomie:taken";

/* ── Upstash Redis over REST ───────────────────────────────────────────── */

function redisStore(url: string, token: string): BookingStore {
  const call = async (command: unknown[]): Promise<unknown> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Booking store returned ${response.status}`);
    }

    const body = (await response.json()) as { result?: unknown };
    return body.result;
  };

  return {
    kind: "redis",
    durable: true,

    async get(start) {
      const raw = await call(["GET", SLOT_KEY(start)]);
      return typeof raw === "string" ? (JSON.parse(raw) as Booking) : null;
    },

    async claim(booking) {
      // SET NX is the whole reason this is safe under concurrency: two people
      // submitting the same slot at the same moment cannot both win it.
      const result = await call([
        "SET",
        SLOT_KEY(booking.start),
        JSON.stringify(booking),
        "NX",
      ]);
      if (result === null) return false;
      await call(["SADD", TAKEN_SET, booking.start]);
      return true;
    },

    async taken() {
      const members = await call(["SMEMBERS", TAKEN_SET]);
      return Array.isArray(members) ? (members as string[]) : [];
    },

    async release(start) {
      await call(["DEL", SLOT_KEY(start)]);
      await call(["SREM", TAKEN_SET, start]);
    },

    async hit(key, windowMs) {
      const bucket = `loomie:rate:${key}`;
      const count = Number(await call(["INCR", bucket]));
      if (count === 1) {
        await call(["PEXPIRE", bucket, String(windowMs)]);
      }
      return count;
    },
  };
}

/* ── In-process fallback, for local development only ───────────────────── */

const bookings = new Map<string, Booking>();
const hits = new Map<string, number[]>();

const memoryStore: BookingStore = {
  kind: "memory",
  durable: false,

  async get(start) {
    return bookings.get(start) ?? null;
  },

  async claim(booking) {
    if (bookings.has(booking.start)) return false;
    bookings.set(booking.start, booking);
    return true;
  },

  async taken() {
    return [...bookings.keys()];
  },

  async release(start) {
    bookings.delete(start);
  },

  async hit(key, windowMs) {
    const now = Date.now();
    const window = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
    window.push(now);
    hits.set(key, window);
    return window.length;
  },
};

let warned = false;

export function getBookingStore(): BookingStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) return redisStore(url, token);

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.warn(
      "[loomie] No UPSTASH_REDIS_REST_URL configured. Bookings are being " +
        "held in process memory and will be lost on restart, and will not be " +
        "shared between instances. Do not run the booking form this way in " +
        "production."
    );
  }

  return memoryStore;
}

export const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };
