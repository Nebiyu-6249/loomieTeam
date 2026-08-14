"use client";

import React, { useState } from "react";
import { deleteRow } from "@/app/admin/crud";

/**
 * Deleting, with the confirmation inline rather than in a dialog.
 *
 * A browser `confirm()` is a modal nobody reads and a native prompt that
 * ignores the site's own typography; a custom dialog is focus management and
 * escape handling for one button. This is two clicks with the name of the thing
 * printed in between, which is the part that actually prevents the mistake.
 *
 * Deletion is real. Nothing is soft-deleted, because a row that is invisible
 * but present is a thing somebody has to remember exists — the publish flag is
 * already there for "take it off the site and keep it".
 */
export function DeleteRow({
  resourceKey,
  id,
  name,
  noun,
}: {
  resourceKey: string;
  id: string;
  name: string;
  noun: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="mt-16 max-w-2xl border-t border-border-custom pt-6">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Delete this {noun.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-16 max-w-2xl border border-border-custom p-5">
      <p className="text-sm leading-snug text-foreground">
        Delete <strong className="font-normal">{name}</strong>? It goes from the
        site and from here, and there is no undo. To take it off the site and
        keep it, untick Published instead.
      </p>

      <div className="mt-5 flex items-center gap-8">
        <form
          action={async () => {
            await deleteRow(resourceKey, id);
          }}
        >
          <button
            type="submit"
            className="text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
              Yes, delete it
            </span>
          </button>
        </form>

        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
