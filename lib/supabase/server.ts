import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  SupabaseNotConfiguredError,
  isSupabaseConfigured,
} from "./config";

/**
 * Server-side Supabase, in two flavours, and the difference matters.
 *
 * `serverClient()` carries the visitor's cookies, so it acts as whoever is
 * signed in and every row-level policy applies. This is what the admin uses:
 * an editor's session can do exactly what an editor's session is allowed to
 * do, and that is decided by the database rather than by remembering to check
 * in a route handler.
 *
 * `serviceClient()` bypasses row-level security entirely. It exists for the
 * two things a visitor must be able to cause without being able to read —
 * writing a booking and writing an enquiry — and for the seed. It is never
 * constructed in a Client Component, never in the browser, and the key it uses
 * is not prefixed NEXT_PUBLIC_, so it cannot be.
 *
 * `publicClient()` reads no cookies at all. It is what the public pages use,
 * and the reason they use it is that touching `cookies()` opts a route out of
 * static rendering for good: a marketing site whose every page went dynamic
 * because its content reader happened to carry a session it never needed would
 * be paying request-time cost for nothing. Public content is public — the anon
 * role can read exactly the published rows and no more, which is the same
 * answer for every visitor and therefore cacheable.
 *
 * Uses @supabase/ssr's cookie interface. The old auth-helpers packages are
 * deprecated and are deliberately not installed.
 */

/**
 * The anonymous reader. No cookies, no session, no per-visitor variation.
 *
 * Row level security still applies; it applies as `anon`, which is the role
 * the public policies were written for.
 */
export function publicClient() {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError("This page");

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The session-bearing client. Row level security applies to everything it does. */
export async function serverClient() {
  if (!isSupabaseConfigured()) throw new SupabaseNotConfiguredError("This page");

  const store = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // middleware refreshes the session, so this is the expected path and
          // not an error.
        }
      },
    },
  });
}

/**
 * The unrestricted client. Server-only, and only for what the public must be
 * able to write without being able to read.
 */
export function serviceClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secret) {
    throw new SupabaseNotConfiguredError("This operation");
  }

  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
