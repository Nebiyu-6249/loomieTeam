import React from "react";
import Link from "next/link";
import { reorderRow } from "@/app/admin/crud";

/**
 * Move a row up, move it down, or open it.
 *
 * Buttons rather than drag handles. Dragging needs a mouse, a steady hand and a
 * keyboard equivalent nobody ever writes; two buttons work with a keyboard, a
 * screen reader and a phone, and these lists are short enough that "up" twice
 * is not a hardship.
 *
 * Each arrow is its own form posting a Server Action, which is why they work
 * with JavaScript switched off as well.
 */
export function RowActions({
  resourceKey,
  id,
  orderable,
  first,
  last,
}: {
  resourceKey: string;
  id: string;
  orderable: boolean;
  first: boolean;
  last: boolean;
}) {
  const button =
    "px-2 py-1 font-mono text-[0.75rem] text-foreground-secondary transition-colors duration-200 hover:text-foreground disabled:opacity-30 disabled:hover:text-foreground-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

  return (
    <div className="inline-flex items-center gap-1">
      {orderable ? (
        <>
          <form
            action={async () => {
              "use server";
              await reorderRow(resourceKey, id, "up");
            }}
          >
            <button type="submit" disabled={first} className={button}>
              <span aria-hidden="true">↑</span>
              <span className="sr-only">Move up</span>
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await reorderRow(resourceKey, id, "down");
            }}
          >
            <button type="submit" disabled={last} className={button}>
              <span aria-hidden="true">↓</span>
              <span className="sr-only">Move down</span>
            </button>
          </form>
        </>
      ) : null}

      <Link
        href={`/admin/${resourceKey}/${id}`}
        className="ml-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        Edit
      </Link>
    </div>
  );
}
