"use client";

import React, { useActionState } from "react";
import { uploadMedia } from "@/app/admin/media/actions";
import type { FormState } from "@/app/admin/crud";

/**
 * One file at a time, with its description asked for at the same moment.
 *
 * Alt text is a field on the upload form rather than something to fill in
 * afterwards, because "afterwards" is where descriptions go to not get written.
 */
export function MediaUpload() {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadMedia, {});

  return (
    <form action={action} className="max-w-2xl border border-border-custom p-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        Upload
      </h2>

      <label className="mt-6 block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          File
        </span>
        <input
          type="file"
          name="file"
          required
          accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
          aria-invalid={state.field === "file" || undefined}
          className="mt-2 block w-full text-sm text-foreground file:mr-4 file:border file:border-border-custom file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        <span className="mt-2 block text-sm text-foreground-secondary">
          JPEG, PNG, WebP, AVIF or SVG, up to 8MB. Resize large photographs
          before uploading — the site serves them at a fraction of the size and
          an 8MB original helps nobody.
        </span>
      </label>

      <label className="mt-7 block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          Description
        </span>
        <input
          type="text"
          name="alt"
          maxLength={300}
          className="mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        <span className="mt-2 block text-sm text-foreground-secondary">
          What is in the picture, for anybody who cannot see it. Describe the
          subject, not the file.
        </span>
      </label>

      {state.error ? (
        <p role="alert" className="mt-6 text-sm leading-snug text-foreground">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 text-base text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {pending ? "Uploading…" : "Upload"}
        </span>
      </button>
    </form>
  );
}
