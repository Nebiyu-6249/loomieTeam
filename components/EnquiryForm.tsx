"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Service } from "@/lib/content-types";

/**
 * For people who do not want to pick a time.
 *
 * The booking panel is the right default and the wrong only option: somebody
 * comparing studios on a Tuesday evening does not want to commit to a Thursday
 * morning, they want to send a paragraph. Until now the site's answer was "our
 * email address is over there", and an email is a message nobody can assign,
 * track or mark as answered.
 *
 * Deliberately plainer than the booking panel — four fields and a button, no
 * timezone arithmetic, no live availability. It sits below the panel because it
 * is the second choice, not because it matters less.
 */

type State =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; notified: boolean }
  | { status: "error"; message: string; field?: string };

export function EnquiryForm({ services }: { services: Service[] }) {
  const [state, setState] = useState<State>({ status: "idle" });

  /**
   * When the form reached the visitor, for the minimum fill time.
   *
   * Set in an effect rather than at first render: `Date.now()` during render is
   * an impure call, and on a server-rendered page it would be stamped when the
   * HTML was generated rather than when somebody actually saw it — which for a
   * cached page could be hours earlier, defeating the check entirely.
   */
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "sending") return;

    const form = new FormData(event.currentTarget);
    setState({ status: "sending" });

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
          service: form.get("service"),
          message: form.get("message"),
          website: form.get("website"),
          openedAt: openedAt.current,
        }),
      });

      const body = (await response.json()) as {
        ok: boolean;
        error?: string;
        field?: string;
        notified?: boolean;
      };

      if (!response.ok || !body.ok) {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong. Please try again.",
          field: body.field,
        });
        return;
      }

      setState({ status: "sent", notified: body.notified !== false });
    } catch {
      setState({
        status: "error",
        message: "We could not reach the studio. Please check your connection and try again.",
      });
    }
  }

  const field =
    "mt-2 w-full bg-transparent border-b border-border-custom py-2 text-foreground placeholder:text-foreground-secondary/60 focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
  const label =
    "font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary";

  if (state.status === "sent") {
    return (
      <div className="border-t border-foreground/25 pt-6">
        <h3 className="font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
          Message sent
        </h3>
        {/* Two different things happened, and they deserve two different
            sentences. The message is recorded either way; whether anybody has
            been alerted to it yet is what changes. */}
        <p className="mt-4 max-w-md text-base leading-snug text-foreground-secondary">
          {state.notified
            ? "It has reached the studio and somebody will reply to the address you gave. If it is urgent, a reply to that email is the fastest way back to us."
            : "It is recorded and the studio will see it. Our notification email did not go out, so a reply may take a little longer than usual."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="border-t border-border-custom pt-6">
      <h3 className="font-display font-normal text-2xl md:text-3xl leading-none text-foreground">
        Or send a message
      </h3>
      <p className="mt-3 max-w-md text-sm leading-snug text-foreground-secondary">
        No time to pick? Tell us what you are building and what is in the way.
      </p>

      {/* Honeypot. Hidden from people, irresistible to form-fillers. */}
      <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        <label className="block">
          <span className={label}>Name</span>
          <input type="text" name="name" required autoComplete="name" className={field} />
        </label>

        <label className="block">
          <span className={label}>Email</span>
          <input type="email" name="email" required autoComplete="email" className={field} />
        </label>

        <label className="block">
          <span className={label}>
            Company <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            type="text"
            name="company"
            autoComplete="organization"
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>What is it about?</span>
          <select name="service" defaultValue="" className={field}>
            <option value="" className="bg-surface text-foreground">
              Not sure yet
            </option>
            {services.map((service) => (
              <option
                key={service.id}
                value={service.id}
                className="bg-surface text-foreground"
              >
                {service.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-6 block">
        <span className={label}>Message</span>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={4000}
          className={`${field} resize-y`}
        />
      </label>

      {state.status === "error" ? (
        <p role="alert" className="mt-5 text-sm leading-snug text-foreground">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state.status === "sending"}
        className="mt-8 inline-flex items-baseline gap-3 font-sans text-lg text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
          {state.status === "sending" ? "Sending…" : "Send message"}
        </span>
      </button>
    </form>
  );
}
