"use client";

import React, { useActionState } from "react";
import { invite } from "@/app/admin/people/actions";
import type { FormState } from "@/app/admin/crud";

/**
 * Adding somebody.
 *
 * A password is set here rather than an email invitation being sent, because
 * creating the account must work whether or not Supabase has an SMTP provider
 * configured — and on a fresh project it does not.
 *
 * It is a starting point, not a permanent arrangement. Whoever adds somebody
 * knows this password, so the row on this page carries a "Send reset link"
 * button and every administrator can change their own under Your account. The
 * previous version had neither, which meant an inviter knew a colleague's
 * password for as long as the account existed.
 */
export function InviteForm({ canAddOwner }: { canAddOwner: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(invite, {});

  const input =
    "mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  const label =
    "font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary";

  return (
    <form action={action} className="mt-14 max-w-2xl border border-border-custom p-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        Add an administrator
      </h2>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        <div>
          <label htmlFor="invite-name" className={label}>Name</label>
          <input id="invite-name" name="name" required maxLength={80} className={input} />
        </div>

        <div>
          <label htmlFor="invite-email" className={label}>Email</label>
          <input id="invite-email" name="email" type="email" required maxLength={160} className={input} />
        </div>

        <div>
          <label htmlFor="invite-role" className={label}>Role</label>
          <select id="invite-role" name="role" defaultValue="editor" className={input}>
            <option value="editor">Editor</option>
            <option value="admin">Administrator</option>
            {canAddOwner ? <option value="owner">Owner</option> : null}
          </select>
          {canAddOwner ? null : (
            <p className="mt-2 text-sm text-foreground-secondary">
              Only an owner can add another owner.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="invite-password" className={label}>Temporary password</label>
          <input
            id="invite-password"
            name="password"
            type="text"
            required
            minLength={12}
            maxLength={200}
            autoComplete="off"
            className={input}
          />
          <p className="mt-2 text-sm text-foreground-secondary">
            At least 12 characters. You will know it, so give it to them
            directly and send a reset link, or ask them to change it under Your
            account.
          </p>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mt-6 text-sm leading-snug text-foreground">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-7 text-base text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {pending ? "Adding…" : "Add"}
        </span>
      </button>
    </form>
  );
}
