import "server-only";

import { redirect } from "next/navigation";
import { serverClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { AdminRole } from "./supabase/types";

/**
 * Who is signed in, and what they may do.
 *
 * Two facts, and they come from different places on purpose. Supabase Auth
 * says who you are; the `admin_profiles` table says whether that person is
 * allowed in here and in what capacity. Keeping them separate is what makes
 * revoking access a single UPDATE rather than an account deletion, and it is
 * why an authenticated user who is not in admin_profiles gets nothing — being
 * signed in is not the same as being staff.
 *
 * ── No public sign-up ────────────────────────────────────────────────────
 * There is no route that creates an account. Administrators are invited from
 * inside the admin, which writes the auth user and the profile together; a
 * person who reaches the sign-in form without a profile can authenticate and
 * still see nothing. Supabase's own sign-up endpoint should be disabled in the
 * project settings as well — that is a dashboard setting this code cannot make
 * on its own, and the README says so.
 */

export interface Admin {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  role: AdminRole;
}

/**
 * The signed-in administrator, or null.
 *
 * Reads the user from the auth server rather than trusting the session cookie's
 * contents: getUser() validates the token, getSession() does not. The
 * difference matters here because the answer decides what the next screen shows.
 */
export async function currentAdmin(): Promise<Admin | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS lets a signed-in user read their own profile row and no others, so
  // this is safe with the session client rather than the service key.
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id, auth_user_id, name, email, role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  const profile = data as {
    id: string;
    auth_user_id: string;
    name: string;
    email: string;
    role: AdminRole;
    is_active: boolean;
  };

  // Deactivated is not the same as deleted: the row stays for the audit log,
  // and the person stops getting in.
  if (!profile.is_active) return null;

  return {
    id: profile.id,
    authUserId: profile.auth_user_id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
  };
}

/** For pages: the administrator, or a redirect to sign in. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * For pages only owners and admins may open.
 *
 * Editors write content; owners and admins also manage people, bookings,
 * enquiries and settings. The database enforces the same split in its policies,
 * so this is the readable half of a rule that holds even if this check is
 * forgotten somewhere.
 */
export async function requireAdministrator(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role === "editor") redirect("/admin");
  return admin;
}

export function canAdminister(role: AdminRole) {
  return role === "owner" || role === "admin";
}

/** Human wording for a role, in one place. */
export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  editor: "Editor",
};

/**
 * What each role may do, in the words the admin uses to explain itself.
 *
 * Kept beside the checks rather than in a help page, so a change to one is
 * visibly a change to the other.
 */
export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  owner: "Everything, including adding and removing administrators.",
  admin: "Everything except removing the owner.",
  editor: "Content only — projects, services, sectors, team and media.",
};
