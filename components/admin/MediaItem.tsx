"use client";

import React, { useActionState, useState } from "react";
import Image from "next/image";
import { deleteMedia, updateAlt } from "@/app/admin/media/actions";
import type { FormState } from "@/app/admin/crud";
import type { MediaRecord } from "@/app/admin/media/page";

const kb = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`;

export function MediaItem({ item, saved }: { item: MediaRecord; saved: boolean }) {
  const update = updateAlt.bind(null, item.id);
  const [state, action, pending] = useActionState<FormState, FormData>(update, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="border border-border-custom">
      <div className="relative w-full aspect-[4/3] bg-surface-card">
        {item.public_url ? (
          <Image
            src={item.public_url}
            alt={item.alt || ""}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-3"
          />
        ) : null}
      </div>

      <div className="p-4 border-t border-border-custom">
        <p className="font-mono text-[0.65rem] tracking-[0.12em] text-foreground-secondary break-all">
          {item.path}
        </p>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground-secondary">
          {item.mime_type.replace("image/", "")} · {kb(item.size_bytes)}
        </p>

        <form action={action} className="mt-4">
          <label className="block">
            <span className="sr-only">Description for {item.path}</span>
            <input
              type="text"
              name="alt"
              defaultValue={item.alt}
              maxLength={300}
              placeholder="Describe this image"
              className="w-full bg-transparent border-b border-border-custom py-1.5 text-sm text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            />
          </label>

          {state.error ? (
            <p role="alert" className="mt-3 text-sm text-foreground">{state.error}</p>
          ) : null}

          <div className="mt-4 flex items-center gap-6">
            <button
              type="submit"
              disabled={pending}
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {pending ? "Saving…" : saved ? "Saved" : "Save description"}
            </button>

            {confirming ? null : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Delete
              </button>
            )}
          </div>
        </form>

        {confirming ? (
          <div className="mt-4 border-t border-border-custom pt-4">
            <p className="text-sm leading-snug text-foreground">
              Delete this image? If anything on the site still uses it, the
              database will refuse and say so.
            </p>
            <div className="mt-3 flex items-center gap-6">
              <form action={async () => { await deleteMedia(item.id); }}>
                <button
                  type="submit"
                  className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  Yes, delete
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
