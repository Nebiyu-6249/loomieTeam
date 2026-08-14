"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * The browser client, used by the admin's sign-in form and nothing else.
 *
 * Only the publishable key reaches here, which is the point: everything it can
 * do is bounded by row level security, so the worst a stolen copy can do is
 * read what is already public.
 */
export function browserClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
