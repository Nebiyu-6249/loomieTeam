"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";
import { SETTINGS } from "@/lib/admin/settings";
import { revalidateEveryPublicPath } from "@/lib/admin/revalidate";

/** Saves all six together, because they are read together. */

const KEYS = SETTINGS.map((setting) => setting.key);

const Value = z.string().trim().max(400);

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) {
    return { error: "Your account is not allowed to change settings." };
  }

  const values: Record<string, string> = {};
  for (const key of KEYS) {
    const parsed = Value.safeParse(form.get(key) ?? "");
    if (!parsed.success) return { error: "One of these is too long.", field: key };
    values[key] = parsed.data;
  }

  /**
   * All six in one statement.
   *
   * Six separate upserts could stop after three, leaving the site with a new
   * contact address and an old footer line and nothing to say which half had
   * been applied. save_settings raises if the policy filters the write away,
   * so a refusal reaches the interface rather than looking like a save.
   */
  const supabase = await serverClient();
  const { error } = await supabase.rpc("save_settings", {
    p_settings: values,
    p_actor: admin.id,
  });

  if (error) {
    if (error.code === "42501" || /no settings written/.test(error.message)) {
      return { error: "Your account is not allowed to change settings." };
    }
    return { error: error.message };
  }

  // Settings appear on every page — in the navigation, in the footer and in
  // the metadata — so this is the one write that genuinely touches all of
  // them, case studies included.
  revalidateEveryPublicPath();
  redirect("/admin/settings?saved=1");
}
