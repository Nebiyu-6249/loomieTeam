"use client";

import React, { useState } from "react";
import { deleteProject } from "@/app/admin/projects/actions";

/** Same two-step confirmation as everything else, with the title printed. */
export function DeleteProject({ id, slug, title }: { id: string; slug: string; title: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="mt-16 max-w-2xl border-t border-border-custom pt-6">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Delete this project
        </button>
      </div>
    );
  }

  return (
    <div className="mt-16 max-w-2xl border border-border-custom p-5">
      <p className="text-sm leading-snug text-foreground">
        Delete <strong className="font-normal">{title}</strong>? Its sections
        and gallery go with it, and /work/{slug} stops resolving. To take it off
        the site and keep it, untick Published instead.
      </p>

      <div className="mt-5 flex items-center gap-8">
        <form
          action={async () => {
            await deleteProject(id, slug);
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
