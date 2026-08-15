"use client";

import React, { useActionState } from "react";
import type { FormState } from "@/app/admin/crud";

/**
 * Two fields and a button, used by both password screens.
 *
 * `autoComplete="new-password"` on both, so a manager offers to generate one
 * rather than filling in the old one.
 */
export function PasswordForm({
  action,
  submitLabel = "Change password",
  done,
  doneMessage,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel?: string;
  done?: boolean;
  doneMessage?: string;
}) {
  const [state, submit, pending] = useActionState<FormState, FormData>(action, {});

  const input =
    "mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  const label =
    "font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary";

  return (
    <form action={submit} className="max-w-sm">
      {done && !state.error ? (
        <p role="status" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          {doneMessage ?? "Changed. Your next sign-in uses the new password."}
        </p>
      ) : null}

      <label className="block">
        <span className={label}>New password</span>
        <input
          type="password"
          name="password"
          required
          minLength={12}
          autoComplete="new-password"
          aria-invalid={state.field === "password" || undefined}
          className={input}
        />
        <span className="mt-2 block text-sm text-foreground-secondary">
          At least 12 characters. Longer beats complicated.
        </span>
      </label>

      <label className="mt-7 block">
        <span className={label}>Again</span>
        <input
          type="password"
          name="confirm"
          required
          minLength={12}
          autoComplete="new-password"
          aria-invalid={state.field === "confirm" || undefined}
          className={input}
        />
      </label>

      {state.error ? (
        <p role="alert" className="mt-6 text-sm leading-snug text-foreground">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 text-base text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {pending ? "Saving…" : submitLabel}
        </span>
      </button>
    </form>
  );
}
