"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";

const Status = z.enum(["new", "in_progress", "replied", "closed", "spam"]);

export async function setEnquiryStatus(id: string, form: FormData) {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) return;

  const parsed = Status.safeParse(form.get("status"));
  if (!parsed.success) return;

  const supabase = await serverClient();
  await supabase
    .from("enquiries")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}
