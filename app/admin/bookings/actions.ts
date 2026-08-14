"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { canAdminister, requireAdmin } from "@/lib/auth";

/**
 * The only thing anybody may change about a booking.
 *
 * Not the name, not the email, not the time. A booking is a record of what a
 * visitor did; correcting their surname in it is rewriting the record, and if
 * the time is wrong the answer is to cancel and rebook rather than to move a
 * row and leave the visitor holding a different appointment.
 *
 * Cancelling is the one status with a side effect on the public site: the
 * partial unique index only counts live bookings, so a cancelled slot goes
 * back into availability by itself.
 */

const Status = z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]);

export async function setBookingStatus(id: string, form: FormData) {
  const admin = await requireAdmin();
  if (!canAdminister(admin.role)) return;

  const parsed = Status.safeParse(form.get("status"));
  if (!parsed.success) return;

  const supabase = await serverClient();
  await supabase
    .from("bookings")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}
