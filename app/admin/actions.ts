"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Signing in and out.
 *
 * Server Actions rather than a route handler, because the cookie has to be
 * written on the response that also redirects, and @supabase/ssr's cookie
 * interface is happiest when it owns both.
 *
 * ── What this deliberately does not do ───────────────────────────────────
 * It does not tell you whether an email address exists. Wrong password and
 * unknown account return the same sentence, because a form that distinguishes
 * them is a list of who works here, offered to anybody who asks.
 *
 * It does not check whether the account has an admin profile. Supabase decides
 * whether the credentials are real; whether the person is staff is decided by
 * requireAdmin() on the page they land on. Refusing here with "you are not an
 * administrator" would confirm the credentials to somebody who guessed them.
 */

const Credentials = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(200),
});

export interface LoginState {
  error?: string;
}

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase is not configured. See README.md." };
  }

  const parsed = Credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter an email address and a password." };
  }

  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Logged without the password and without the address, so a log file does
    // not become the credential list this form refuses to be.
    console.warn("[loomie] admin sign-in refused:", error.message);
    return { error: "That email address and password do not match." };
  }

  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await serverClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
