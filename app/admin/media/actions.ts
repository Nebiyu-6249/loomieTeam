"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverClient, serviceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  BUCKET,
  MAX_BYTES,
  UPLOAD_PREFIX,
  isAllowedType,
  megabytes,
  typeNames,
} from "@/lib/media";
import type { FormState } from "@/app/admin/crud";

/**
 * The media library: uploads, alt text, and deletion.
 *
 * ── Why the browser uploads straight to Storage ──────────────────────────
 * The file used to be posted to a Server Action, which meant the bytes went
 * browser → serverless function → Storage. That cannot carry the 8MB this form
 * offers, and the limit is not ours to raise: Next caps a Server Action body at
 * 1MB by default, and Vercel caps a function request body at roughly 4.5MB
 * whatever Next is configured to allow. Raising `serverActions.bodySizeLimit`
 * moves the failure from one layer to the next rather than fixing it, and the
 * symptom is the generic server-error page rather than a message anybody can
 * act on.
 *
 * So the bytes no longer cross a function at all. The server issues a signed
 * upload ticket for one path it chose, the browser PUTs the file directly to
 * Supabase Storage, and then a second call — metadata only, a few hundred bytes
 * — records the row. Authorisation stays here: no ticket is issued without an
 * administrator session, the path is the server's to pick, and the secret key
 * never leaves the server.
 *
 * ── Two writes, and they can still disagree ──────────────────────────────
 * There is no transaction spanning Storage and Postgres, so the order still
 * matters: the object goes up first, and if the row then fails to insert the
 * object is removed again. The alternative — row first — leaves a row pointing
 * at a file that does not exist, which is the failure that shows up on the
 * public site rather than here.
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
  return `${UPLOAD_PREFIX}${crypto.randomUUID().slice(0, 8)}-${cleaned || "file"}`;
}

/**
 * The message to show when the bucket is not there.
 *
 * Worth its own function because it is the one Storage failure that is a setup
 * mistake rather than a runtime one, and the fix is four clicks somebody needs
 * telling about.
 */
function missingBucketMessage() {
  return (
    `No Storage bucket named "${BUCKET}" was found. In Supabase, open ` +
    `Storage → New bucket, name it "${BUCKET}", tick Public bucket, and save. ` +
    `Uploads cannot work until it exists.`
  );
}

export type TicketResult =
  | { ok: true; signedUrl: string; path: string; token: string }
  | { ok: false; error: string; field?: string };

/**
 * Checks the bucket is there, and says what to do if it is not.
 *
 * Separated so the library page can ask the same question on load rather than
 * letting somebody find out by picking a file first.
 */
export async function checkStorage(): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  let service;
  try {
    service = serviceClient();
  } catch {
    return { ok: false, error: "Supabase is not configured on the server." };
  }

  const { error } = await service.storage.getBucket(BUCKET);
  if (error) {
    // Distinguishing a missing bucket from a broken connection matters,
    // because only one of them is the reader's to fix.
    const missing = /not found|does not exist/i.test(error.message);
    return { ok: false, error: missing ? missingBucketMessage() : error.message };
  }

  return { ok: true };
}

/**
 * Issues a one-shot ticket to upload one file to one path.
 *
 * The browser has already checked the type and size; this checks them again,
 * because a check that only runs in the browser is a courtesy rather than a
 * rule. The path is chosen here and not accepted from the caller, so a ticket
 * can never authorise writing over something else.
 */
export async function createUploadTicket(input: {
  name: string;
  type: string;
  size: number;
}): Promise<TicketResult> {
  await requireAdmin();

  const name = typeof input?.name === "string" ? input.name : "";
  const type = typeof input?.type === "string" ? input.type : "";
  const size = Number(input?.size);

  if (!isAllowedType(type)) {
    return {
      ok: false,
      field: "file",
      error: `That file type is not supported. Use ${typeNames()}.`,
    };
  }

  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, field: "file", error: "That file is empty.", };
  }

  if (size > MAX_BYTES) {
    return {
      ok: false,
      field: "file",
      error: `That file is ${megabytes(size)}. The limit is ${megabytes(MAX_BYTES)} — resize it first.`,
    };
  }

  let service;
  try {
    service = serviceClient();
  } catch {
    return { ok: false, error: "Supabase is not configured on the server." };
  }

  const path = objectPath(name);
  const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    const message = error?.message ?? "unknown error";
    const missing = /bucket not found|does not exist/i.test(message);
    return { ok: false, error: missing ? missingBucketMessage() : `Storage refused the upload: ${message}` };
  }

  return { ok: true, signedUrl: data.signedUrl, path: data.path, token: data.token };
}

export type RegisterResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Records an object that is already in Storage.
 *
 * Metadata only — a few hundred bytes — so this one is a Server Action safely.
 * The size and type are read back from Storage rather than taken from the
 * browser: the row should describe the file that exists, not the file the
 * browser said it was sending. If the row cannot be written the object is
 * removed, because an object nothing references is invisible to the library and
 * would sit in the bucket forever.
 */
export async function registerMedia(input: {
  path: string;
  alt: string;
}): Promise<RegisterResult> {
  await requireAdmin();

  const path = typeof input?.path === "string" ? input.path : "";
  if (!path.startsWith(UPLOAD_PREFIX) || path.includes("..")) {
    return { ok: false, error: "That upload path is not one this admin issued." };
  }

  const alt = String(input?.alt ?? "").trim().slice(0, 300);

  let service;
  try {
    service = serviceClient();
  } catch {
    return { ok: false, error: "Supabase is not configured on the server." };
  }

  const storage = service.storage.from(BUCKET);

  // Confirm the object really arrived. Without this a failed upload that the
  // browser mistook for a success would leave a row pointing at nothing.
  const { data: info, error: infoError } = await storage.info(path);
  if (infoError || !info) {
    // The object may well be there — it is the *confirmation* that failed. No
    // row is going to reference it either way, so remove it rather than leave a
    // file in the bucket that the library will never show. If it genuinely is
    // not there, this is a no-op.
    await storage.remove([path]);
    return {
      ok: false,
      error: `The file did not arrive in Storage, so nothing was recorded${
        infoError ? `: ${infoError.message}` : "."
      }`,
    };
  }

  const mimeType = info.contentType ?? "application/octet-stream";
  const sizeBytes = Number(info.size ?? 0);

  if (!isAllowedType(mimeType)) {
    await storage.remove([path]);
    return { ok: false, error: `Storage received a ${mimeType}, which is not a supported image.` };
  }

  if (sizeBytes > MAX_BYTES) {
    await storage.remove([path]);
    return {
      ok: false,
      error: `Storage received ${megabytes(sizeBytes)}, over the ${megabytes(MAX_BYTES)} limit.`,
    };
  }

  const { data: url } = storage.getPublicUrl(path);

  // The row goes in through the administrator's own session, so row level
  // security decides whether they may write it.
  const supabase = await serverClient();
  const { data: row, error: rowError } = await supabase
    .from("media")
    .insert({
      bucket: BUCKET,
      path,
      public_url: url.publicUrl,
      alt,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select("id")
    .maybeSingle();

  if (rowError || !row) {
    // The object is up and nothing references it. Remove it rather than
    // leaving a file in the bucket that the library does not know about.
    await storage.remove([path]);
    return {
      ok: false,
      error: rowError
        ? `Uploaded, but not recorded: ${rowError.message}. The file has been removed again.`
        : "Uploaded, but not recorded — your account may not be allowed to add media. The file has been removed again.",
    };
  }

  revalidatePath("/admin/media");
  return { ok: true, id: (row as { id: string }).id };
}

/**
 * Throws away an object the browser uploaded but could not finish registering.
 *
 * Called when the upload is abandoned after the bytes have landed. Best effort:
 * if it fails the worst case is an unreferenced file, which is the same state
 * the old code left behind on any interruption.
 */
export async function discardUpload(path: string): Promise<void> {
  await requireAdmin();
  if (typeof path !== "string" || !path.startsWith(UPLOAD_PREFIX) || path.includes("..")) return;

  try {
    await serviceClient().storage.from(BUCKET).remove([path]);
  } catch {
    // Nothing to tell the reader: they are already being shown why the upload
    // failed, and this was the tidying up afterwards.
  }
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
