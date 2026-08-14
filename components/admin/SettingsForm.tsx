"use client";

import React, { useActionState } from "react";
import { saveSettings } from "@/app/admin/settings/actions";
import type { FormState } from "@/app/admin/crud";
import type { Setting } from "@/lib/admin/settings";

/** Six fields, one save. They are read together, so they are written together. */
export function SettingsForm({
  settings,
  values,
  saved,
}: {
  settings: Setting[];
  values: Record<string, string>;
  saved: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});

  const input =
    "mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

  return (
    <form action={action} className="max-w-2xl">
      {saved && !state.error ? (
        <p role="status" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          Saved, and live on the site.
        </p>
      ) : null}

      <div className="space-y-8">
        {settings.map((setting) => (
          <div key={setting.key}>
            <label
              htmlFor={setting.key}
              className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary"
            >
              {setting.label}
            </label>

            {setting.kind === "textarea" ? (
              <textarea
                id={setting.key}
                name={setting.key}
                rows={3}
                maxLength={400}
                defaultValue={values[setting.key] ?? ""}
                aria-describedby={`${setting.key}-help`}
                aria-invalid={state.field === setting.key || undefined}
                className={input}
              />
            ) : (
              <input
                id={setting.key}
                name={setting.key}
                type={setting.kind === "email" ? "email" : "text"}
                maxLength={400}
                defaultValue={values[setting.key] ?? ""}
                aria-describedby={`${setting.key}-help`}
                aria-invalid={state.field === setting.key || undefined}
                className={input}
              />
            )}

            <p id={`${setting.key}-help`} className="mt-2 text-sm leading-snug text-foreground-secondary">
              {setting.help}
            </p>
          </div>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="mt-8 text-sm leading-snug text-foreground">{state.error}</p>
      ) : null}

      <div className="mt-10 border-t border-border-custom pt-6">
        <button
          type="submit"
          disabled={pending}
          className="text-lg text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
            {pending ? "Saving…" : "Save"}
          </span>
        </button>
      </div>
    </form>
  );
}
