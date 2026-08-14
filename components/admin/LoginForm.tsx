"use client";

import React, { useActionState } from "react";
import { signIn, type LoginState } from "@/app/admin/actions";

/**
 * Email and password, and nothing else.
 *
 * No "remember me" (the session already persists), no social sign-in, and no
 * link to create an account, because there is no way to create one from
 * outside. The error is deliberately the same sentence for a wrong password
 * and an unknown address.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={action} className="mt-10">
      <label className="block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          Email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
      </label>

      <label className="mt-7 block">
        <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
          Password
        </span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
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
        className="mt-9 inline-flex items-baseline gap-3 text-lg text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {pending ? "Signing in…" : "Sign in"}
        </span>
      </button>
    </form>
  );
}
