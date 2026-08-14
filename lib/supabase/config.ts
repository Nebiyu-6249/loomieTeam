/**
 * Whether there is a database, and what to do when there is not.
 *
 * One decision, made here, that the rest of the codebase reads rather than
 * re-deciding: is Supabase configured, and is this production.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 * Configured → Supabase is the source of truth for everything, public pages
 * and admin alike.
 *
 * Not configured, and not production → the seeded content in lib/seed-content
 * renders, loudly, so the site can be developed and looked at before a project
 * exists. The admin refuses and says why.
 *
 * Not configured, in production → public content pages refuse rather than
 * quietly serving hardcoded copy. That is the state worth being strict about:
 * a live site showing one set of content while an admin writes to another is
 * worse than a site that says it is not finished being set up.
 *
 * What is never allowed is the third thing — Supabase configured for the admin
 * but the public pages still reading constants. Everything goes through
 * lib/content, so there is only ever one answer at a time.
 */

/** Publishable key. Safe in the browser; Supabase's newer name for `anon`. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * True when the seeded content may stand in for the database.
 *
 * Development only, and never a silent condition: callers log the first time
 * they fall back.
 */
export function seedFallbackAllowed() {
  return !isSupabaseConfigured() && !isProduction();
}

export class SupabaseNotConfiguredError extends Error {
  constructor(what: string) {
    super(
      `${what} needs Supabase. Set NEXT_PUBLIC_SUPABASE_URL and ` +
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (and SUPABASE_SECRET_KEY on the ` +
        `server). See README.md — "Setting up Supabase".`
    );
    this.name = "SupabaseNotConfiguredError";
  }
}

let announced = false;

/** Says it once per process rather than once per request. */
export function announceSeedFallback() {
  if (announced) return;
  announced = true;
  console.warn(
    "[loomie] Supabase is not configured. Public pages are rendering the " +
      "seeded content from lib/seed-content, the admin is unavailable, and " +
      "nothing written anywhere will persist. This is allowed in development " +
      "only — production refuses to serve content pages in this state."
  );
}
