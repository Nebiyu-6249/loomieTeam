"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";
import { SETTINGS } from "@/lib/admin/settings";

/** Saves all six together, because they are read together. */

const KEYS = SETTINGS.map((setting) => setting.key);

const Value = z.string().trim().max(400);

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) {
    return { error: "Your account is not allowed to change settings." };
  }

  const supabase = await serverClient();

  for (const key of KEYS) {
    const parsed = Value.safeParse(form.get(key) ?? "");
    if (!parsed.success) return { error: "One of these is too long.", field: key };

    // Upsert rather than update: a setting nobody has saved yet has no row,
    // and a missing row should not mean a field that silently does nothing.
    const { error } = await supabase
      .from("site_settings")
      .upsert(
        { key, value: parsed.data, updated_by: admin.id, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) return { error: error.message, field: key };
  }

  // Settings appear on every page, so this is the one write that genuinely
  // touches all of them.
  for (const path of ["/", "/work", "/services", "/clients", "/about", "/contact"]) {
    revalidatePath(path);
  }
  redirect("/admin/settings?saved=1");
}
