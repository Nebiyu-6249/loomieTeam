"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/crud";

/**
 * The media library: uploads, alt text, and deletion.
 *
 * ── Two writes, and they can disagree ────────────────────────────────────
 * An upload is a file in Storage and a row in `media`, and there is no
 * transaction spanning both. So the order matters: the object goes up first,
 * and if the row then fails to insert the object is removed again. The
 * alternative — row first — leaves a row pointing at a file that does not
 * exist, which is the failure that shows up on the public site rather than
 * here.
 *
 * ── Why the service client uploads ───────────────────────────────────────
 * Storage policies are configured in the Supabase dashboard rather than in
 * these migrations, so an install that has not set them up would fail to
 * upload with a message about a bucket policy. The *permission* to be here at
 * all is still checked — requireAdmin runs first — and the database row is
 * still written through the administrator's own session, where RLS applies.
 *
 * ── What "public bucket" means, stated plainly ───────────────────────────
 * Row level security governs the `media` row, not the bytes. The bucket is
 * public, so every uploaded object is readable by anyone who knows its URL —
 * before it is used anywhere, while it is unpublished, and after it is
 * detached. Deleting the row removes the object too, and that is the only
 * thing here that makes a file stop being downloadable.
 *
 * Nothing in this application makes public Storage objects private, and the
 * admin says so at the point of upload rather than leaving somebody to assume
 * otherwise.
 */

const BUCKET = "site";

/** What the media table's own CHECK constraint allows. */
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

const MAX_BYTES = 8 * 1024 * 1024;

const Alt = z.object({
  alt: z.string().trim().max(300),
});

/** A safe object path from the original filename. */
function objectPath(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  // Prefixed with a random segment so two uploads of "logo.png" do not
  // collide, and so a guessed filename is not a guessed URL.
  return `uploads/${crypto.randomUUID().slice(0, 8)}-${cleaned || "file"}`;
}

export async function uploadMedia(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload.", field: "file" };
  }

  if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
    return {
      error: `That file type is not supported. Use ${ALLOWED.map((t) => t.replace("image/", "")).join(", ")}.`,
      field: "file",
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      error: `That file is ${Math.round(file.size / 1024 / 1024)}MB. The limit is ${MAX_BYTES / 1024 / 1024}MB — resize it first.`,
      field: "file",
    };
  }

  const alt = String(form.get("alt") ?? "").trim().slice(0, 300);
  const path = objectPath(file.name);
  const storage = serviceClient().storage.from(BUCKET);

  const { error: uploadError } = await storage.upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return {
      error:
        `The file could not be stored: ${uploadError.message}. ` +
        `Check that a public bucket named "${BUCKET}" exists in Supabase Storage.`,
    };
  }

  const { data: url } = storage.getPublicUrl(path);

  const supabase = await serverClient();
  const { error: rowError } = await supabase.from("media").insert({
    bucket: BUCKET,
    path,
    public_url: url.publicUrl,
    alt,
    mime_type: file.type,
    size_bytes: file.size,
  });

  if (rowError) {
    // The object is up and nothing references it. Remove it rather than
    // leaving a file in the bucket that the library does not know about.
    await storage.remove([path]);
    return { error: `Uploaded, but not recorded: ${rowError.message}` };
  }

  revalidatePath("/admin/media");
  redirect("/admin/media?uploaded=1");
}

export async function updateAlt(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = Alt.safeParse({ alt: form.get("alt") });
  if (!parsed.success) return { error: "That description is too long.", field: "alt" };

  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("media")
    .update({ alt: parsed.data.alt })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Nothing was saved — your account may not be allowed to change this." };
  }

  // Alt text appears wherever the image does, which is everywhere.
  for (const path of ["/", "/work", "/services", "/clients", "/about"]) {
    revalidatePath(path);
  }
  revalidatePath("/admin/media");
  redirect(`/admin/media?saved=${id}`);
}

export async function deleteMedia(id: string) {
  await requireAdmin();

  const supabase = await serverClient();
  const { data } = await supabase
    .from("media")
    .select("bucket, path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("media").delete().eq("id", id);

  if (error) {
    // 23503 is the ON DELETE RESTRICT doing its job: something on the site is
    // still showing this picture, and removing it would leave a hole.
    const message =
      error.code === "23503"
        ? "That image is still used by a project, service, sector, team member or partner. Remove it there first."
        : error.message;
    redirect(`/admin/media?error=${encodeURIComponent(message)}`);
  }

  // The row is gone, so the object is unreferenced. A failure here leaves an
  // orphan file rather than a broken page, which is the better way round.
  if (data) {
    const row = data as { bucket: string; path: string };
    await serviceClient().storage.from(row.bucket).remove([row.path]);
  }

  revalidatePath("/admin/media");
  redirect("/admin/media");
}
