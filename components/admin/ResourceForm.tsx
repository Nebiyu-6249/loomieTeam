"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import type { Field } from "@/lib/admin/resources";
import type { FormState } from "@/app/admin/crud";

/**
 * One form for every resource, built from its field list.
 *
 * The browser's own validation attributes are set from the same field
 * definitions the server schema is built from, so the immediate feedback and
 * the actual rule cannot disagree — but the schema is what decides whether
 * anything is written. `noValidate` is deliberately absent: catching a missing
 * name before a round trip is worth having, and the server catches it anyway.
 *
 * Every field carries its help text as a real description rather than a
 * placeholder. A placeholder disappears the moment somebody starts typing,
 * which is exactly when they were reading it.
 *
 * Takes the fields and a key, not the whole Resource. A Resource carries its
 * Zod schema, and a Zod schema is functions — passing one from a Server
 * Component to this one fails serialization at runtime with an error that
 * names the schema rather than the boundary. The form never needed it: the
 * schema's job is on the server, where the Server Action already has it.
 */

const inputClass =
  "mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export interface MediaOption {
  id: string;
  label: string;
}

function Input({
  field,
  value,
  media,
  invalid,
}: {
  field: Field;
  value: unknown;
  media: MediaOption[];
  invalid: boolean;
}) {
  const id = `field-${field.name}`;
  const describedBy = field.help ? `${id}-help` : undefined;
  const common = {
    id,
    name: field.name,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    className: inputClass,
  };

  if (field.kind === "boolean") {
    return (
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={id}
          name={field.name}
          defaultChecked={Boolean(value)}
          aria-describedby={describedBy}
          className="mt-1 w-4 h-4 accent-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        />
        <div>
          <label htmlFor={id} className="text-sm text-foreground">
            {field.label}
          </label>
          {field.help ? (
            <p id={describedBy} className="mt-1 text-sm text-foreground-secondary">
              {field.help}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const label = (
    <label
      htmlFor={id}
      className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary"
    >
      {field.label}
      {field.required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );

  const help = field.help ? (
    <p id={describedBy} className="mt-2 text-sm leading-snug text-foreground-secondary">
      {field.help}
    </p>
  ) : null;

  let control: React.ReactNode;

  if (field.kind === "textarea") {
    control = (
      <textarea
        {...common}
        rows={field.rows ?? 3}
        maxLength={field.max}
        required={field.required}
        defaultValue={String(value ?? "")}
      />
    );
  } else if (field.kind === "media") {
    control = (
      <select {...common} defaultValue={value ? String(value) : ""}>
        <option value="">None</option>
        {media.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.kind === "select") {
    control = (
      <select {...common} defaultValue={String(value ?? "")}>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    const type =
      field.kind === "number"
        ? "number"
        : field.kind === "url"
          ? "url"
          : field.kind === "email"
            ? "email"
            : "text";
    control = (
      <input
        {...common}
        type={type}
        maxLength={field.kind === "number" ? undefined : field.max}
        required={field.required}
        pattern={field.kind === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
        defaultValue={String(value ?? "")}
      />
    );
  }

  return (
    <div>
      {label}
      {control}
      {help}
    </div>
  );
}

export function ResourceForm({
  resourceKey,
  fields,
  row,
  media,
  action,
  saved,
}: {
  resourceKey: string;
  fields: Field[];
  /** Empty for a new row. */
  row: Record<string, unknown>;
  media: MediaOption[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
  saved?: boolean;
}) {
  const [state, submit, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={submit} className="max-w-2xl">
      {saved && !state.error ? (
        <p
          role="status"
          className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground"
        >
          Saved, and live on the site.
        </p>
      ) : null}

      <div className="space-y-8">
        {fields.map((field) => (
          <Input
            key={field.name}
            field={field}
            value={row[field.name]}
            media={media}
            invalid={state.field === field.name}
          />
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="mt-8 text-sm leading-snug text-foreground">
          {state.error}
        </p>
      ) : null}

      <div className="mt-10 flex items-center gap-8 border-t border-border-custom pt-6">
        <button
          type="submit"
          disabled={pending}
          className="text-lg text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 hover:border-foreground">
            {pending ? "Saving…" : "Save"}
          </span>
        </button>

        <Link
          href={`/admin/${resourceKey}`}
          className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
