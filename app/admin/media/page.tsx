import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { MediaItem } from "@/components/admin/MediaItem";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { checkStorage } from "@/app/admin/media/actions";

/**
 * Every image the site can use.
 *
 * Alt text is edited here rather than wherever the picture happens to be
 * placed, because it describes the picture and not the placement — the same
 * image on the homepage and in an archive row should not need describing
 * twice, differently.
 */

export const dynamic = "force-dynamic";

export interface MediaRecord {
  id: string;
  path: string;
  public_url: string | null;
  alt: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export default async function MediaLibrary({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; uploaded?: string; saved?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdmin();
  const supabase = await serverClient();

  const [{ data }, query, storage] = await Promise.all([
    supabase
      .from("media")
      .select("id, path, public_url, alt, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false }),
    searchParams,
    // Asked on load rather than on submit: a missing bucket is a setup mistake,
    // and finding out after choosing a file wastes the upload.
    checkStorage(),
  ]);

  const items = (data ?? []) as MediaRecord[];
  const missingAlt = items.filter((item) => !item.alt.trim()).length;

  return (
    <AdminShell
      admin={admin}
      title="Media"
      description="Images available to every section. Deleting one that is still in use is refused rather than leaving a hole in a page."
      actions={
        <p className="max-w-xs text-sm leading-snug text-foreground-secondary">
          Uploads go to a public bucket. Anyone with the address can open the
          file, whether or not it is used on the site.
        </p>
      }
    >
      {query.error ? (
        <p role="alert" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          {query.error}
        </p>
      ) : null}

      {query.uploaded ? (
        <p role="status" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          Uploaded.
        </p>
      ) : null}

      {storage.ok ? (
        <MediaUpload />
      ) : (
        <div
          data-storage-missing
          className="max-w-2xl border border-border-custom p-6"
        >
          <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
            Upload unavailable
          </h2>
          <p role="alert" className="mt-6 text-sm leading-snug text-foreground">
            {storage.error}
          </p>
          <p className="mt-3 text-sm leading-snug text-foreground-secondary">
            Everything already in the library still works; only new uploads are
            blocked. Reload this page once the bucket exists.
          </p>
        </div>
      )}

      {missingAlt > 0 ? (
        <p className="mt-12 max-w-xl border-l border-border-custom pl-4 text-sm leading-snug text-foreground-secondary">
          {missingAlt} {missingAlt === 1 ? "image has" : "images have"} no
          description. Anybody using a screen reader gets nothing where the
          picture is, so it is worth a sentence each.
        </p>
      ) : null}

      <div className="mt-12">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-6">
          {items.length} {items.length === 1 ? "image" : "images"}
        </h2>

        {items.length === 0 ? (
          <p className="text-sm text-foreground-secondary">Nothing uploaded yet.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {items.map((item) => (
              <MediaItem key={item.id} item={item} saved={query.saved === item.id} />
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
