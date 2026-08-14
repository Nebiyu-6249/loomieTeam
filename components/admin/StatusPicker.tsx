"use client";

import React, { useRef } from "react";

/**
 * A status that saves when it changes.
 *
 * No separate save button: the only thing on the row that can be edited is
 * this, and a select followed by a button is two actions for one decision. A
 * submit button is still rendered for anybody without JavaScript, hidden from
 * everyone else — the form works either way.
 */
export function StatusPicker({
  id,
  current,
  options,
  action,
  label,
}: {
  id: string;
  current: string;
  options: { value: string; label: string }[];
  action: (id: string, form: FormData) => Promise<void>;
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const bound = action.bind(null, id);

  return (
    <form ref={formRef} action={bound}>
      <label className="block">
        <span className="sr-only">{label}</span>
        <select
          name="status"
          defaultValue={current}
          onChange={() => formRef.current?.requestSubmit()}
          className="w-full bg-transparent border border-border-custom px-3 py-2 text-sm text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-surface text-foreground">
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <noscript>
        <button
          type="submit"
          className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary"
        >
          Save status
        </button>
      </noscript>
    </form>
  );
}
