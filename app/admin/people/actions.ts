"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";

/**
 * Adding and removing administrators.
 *
 * This is the whole of "sign-up" for this application. There is no public
 * route that creates an account: an administrator invites somebody, which
 * writes a Supabase auth user and the matching admin_profiles row together,
 * and a person who authenticates without that row sees nothing.
 *
 * ── Why the service key is used here and nowhere else ────────────────────
 * Creating an auth user is an admin API call, and the admin API only accepts
 * the service key — there is no way to do it as the signed-in person. So the
 * permission check has to be in this file, and it is: requireAdmin, then an
 * explicit role check, before anything is created. The profile row is written
 * through the administrator's own session immediately afterwards, so RLS still
 * has the final say on whether they may add people at all.
 *
 * ── Deactivating rather than deleting ────────────────────────────────────
 * Removing access sets is_active to false. The row stays, so the audit log
 * still resolves who made each change, and the person stops getting in on the
 * next request. Deleting the auth user is a Supabase dashboard action and is
 * deliberately not offered here.
 */

const Invite = z.object({
  name: z.string().trim().min(2, "Enter their name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  role: z.enum(["owner", "admin", "editor"]),
  password: z
    .string()
    .min(12, "Use at least 12 characters — they can change it afterwards.")
    .max(200),
});

export async function invite(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) {
    return { error: "Your account is not allowed to add administrators." };
  }

  const parsed = Invite.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    role: form.get("role"),
    password: form.get("password"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first.message, field: String(first.path[0] ?? "") };
  }

  // Only an owner may make another owner. An admin promoting themselves past
  // their own level is the one escalation this screen has to prevent.
  if (parsed.data.role === "owner" && admin.role !== "owner") {
    return { error: "Only an owner can add another owner.", field: "role" };
  }

  const service = serviceClient();
  const { data: created, error: authError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    return {
      error:
        authError?.message.includes("already")
          ? "There is already an account with that address."
          : (authError?.message ?? "The account could not be created."),
      field: "email",
    };
  }

  const supabase = await serverClient();
  const { error: profileError } = await supabase.from("admin_profiles").insert({
    auth_user_id: created.user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role,
    is_active: true,
  });

  if (profileError) {
    // The auth user exists and admits nobody, which would be a confusing
    // half-state. Remove it rather than leaving an account that can sign in
    // and see an empty admin.
    await service.auth.admin.deleteUser(created.user.id);
    return { error: `The account was not added: ${profileError.message}` };
  }

  revalidatePath("/admin/people");
  redirect("/admin/people?added=1");
}

export async function setActive(id: string, active: boolean) {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) return;

  const supabase = await serverClient();

  // An administrator who deactivates themselves is locked out by their own
  // click, with no way back in unless somebody else is still active.
  if (id === admin.id) {
    redirect("/admin/people?error=" + encodeURIComponent("You cannot deactivate your own account."));
  }

  await supabase
    .from("admin_profiles")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/people");
}
