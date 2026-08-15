"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";

/**
 * Changing a password, and asking for a reset link.
 *
 * The gap this closes: an account was created with a password its inviter
 * chose and there was no way to change it from inside the application. That
 * means the person who added you knows your password for as long as you have
 * the account, and the only fix was a Supabase dashboard nobody but the owner
 * can reach.
 *
 * Two paths, because they solve different problems. Somebody who is signed in
 * changes their own password directly. Somebody locked out gets a reset link by
 * email, which needs Supabase's SMTP to be configured — and if it is not, the
 * admin says so plainly rather than reporting that an email was sent.
 */

const NewPassword = z
  .object({
    password: z.string().min(12, "Use at least 12 characters."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Those two do not match.",
    path: ["confirm"],
  });

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = NewPassword.safeParse({
    password: form.get("password"),
    confirm: form.get("confirm"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first.message, field: String(first.path[0] ?? "password") };
  }

  const supabase = await serverClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    // Logged without the password, obviously.
    console.warn("[loomie] password change refused:", error.message);
    return { error: error.message };
  }

  redirect("/admin/account?changed=1");
}

/**
 * Sends somebody a reset link.
 *
 * Owners and admins only, and it is not a way to find out whether an address
 * has an account: Supabase answers the same either way, and so does this.
 */
export async function sendReset(email: string) {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) return;

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) {
    redirect(
      "/admin/people?error=" +
        encodeURIComponent(
          "NEXT_PUBLIC_SITE_URL is not set, so the reset link would point at the wrong place."
        )
    );
  }

  const supabase = serviceClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/admin/reset`,
  });

  if (error) {
    redirect(
      "/admin/people?error=" +
        encodeURIComponent(
          `The reset email could not be sent: ${error.message}. Supabase needs an SMTP ` +
            `provider configured under Authentication → Emails before this works.`
        )
    );
  }

  redirect("/admin/people?reset=1");
}
