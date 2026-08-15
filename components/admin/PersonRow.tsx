"use client";

import React from "react";
import { setActive } from "@/app/admin/people/actions";
import { sendReset } from "@/app/admin/account/actions";
import type { AdminRole } from "@/lib/supabase/types";

/**
 * One administrator, with the only control that matters: whether they get in.
 *
 * The row for the signed-in person has no button. Deactivating yourself is a
 * mistake with no undo from inside the application, so it is not offered.
 */
export function PersonRow({
  person,
  roleLabel,
  isSelf,
}: {
  person: { id: string; name: string; email: string; role: AdminRole; is_active: boolean };
  roleLabel: string;
  isSelf: boolean;
}) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border-custom py-5">
      <div>
        <p className="text-base text-foreground">
          {person.name}
          {isSelf ? <span className="text-foreground-secondary"> · you</span> : null}
        </p>
        <p className="mt-1 text-sm text-foreground-secondary break-all">{person.email}</p>
      </div>

      <div className="flex items-center gap-6">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary">
          {roleLabel}
        </span>

        <span
          className={`font-mono text-[0.65rem] uppercase tracking-[0.16em] ${
            person.is_active ? "text-foreground" : "text-foreground-secondary"
          }`}
        >
          {person.is_active ? "Active" : "Deactivated"}
        </span>

        {/* So nobody is stuck on the password whoever invited them chose. */}
        <form action={async () => { await sendReset(person.email); }}>
          <button
            type="submit"
            className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Send reset link
          </button>
        </form>

        {isSelf ? null : (
          <form action={async () => { await setActive(person.id, !person.is_active); }}>
            <button
              type="submit"
              className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {person.is_active ? "Deactivate" : "Reactivate"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
