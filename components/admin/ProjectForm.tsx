"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import type { MediaOption } from "./ResourceForm";
import type { FormState } from "@/app/admin/crud";

/**
 * A case study on one screen.
 *
 * Grouped the way somebody thinks about it rather than the way the tables are
 * shaped: what it is, what it says, and what it shows. The three prose sections
 * are named scenario, direction and demonstration because that is what a
 * concept study actually contains — "brief" and "outcome" each assert something
 * that did not happen.
 *
 * The gallery is a list of rows that can be added and removed in the browser
 * and submitted as parallel fields. No drag reordering: the rows are in the
 * order they appear, and moving one is two clicks rather than a pointer
 * gesture with no keyboard equivalent.
 */

export interface ProjectRowData {
  id?: string;
  slug?: string;
  index?: string;
  title?: string;
  sector?: string;
  year?: string;
  summary?: string;
  study_type?: string;
  status?: string;
  cover_image_id?: string | null;
  hero_image_id?: string | null;
  display_order?: number;
  featured?: boolean;
  published?: boolean;
}

export interface GalleryEntry {
  mediaId: string;
  alt: string;
}

const input =
  "mt-2 w-full bg-transparent border border-border-custom px-3 py-2 text-foreground focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const label =
  "font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary";
const help = "mt-2 text-sm leading-snug text-foreground-secondary";

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-custom pt-8 mt-12 first:mt-0 first:border-0 first:pt-0">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        {title}
      </h2>
      {note ? <p className="mt-3 max-w-xl text-sm text-foreground-secondary">{note}</p> : null}
      <div className="mt-8 space-y-8">{children}</div>
    </section>
  );
}

export function ProjectForm({
  row,
  sections,
  disciplines,
  gallery,
  media,
  action,
  saved,
}: {
  row: ProjectRowData;
  sections: { scenario: string; direction: string; demonstration: string };
  disciplines: string[];
  gallery: GalleryEntry[];
  media: MediaOption[];
  action: (state: FormState, form: FormData) => Promise<FormState>;
  saved?: boolean;
}) {
  const [state, submit, pending] = useActionState<FormState, FormData>(action, {});
  const [rows, setRows] = useState<GalleryEntry[]>(
    gallery.length > 0 ? gallery : [{ mediaId: "", alt: "" }]
  );

  const setRow = (index: number, patch: Partial<GalleryEntry>) =>
    setRows((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry))
    );

  const move = (index: number, by: number) =>
    setRows((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <form action={submit} className="max-w-2xl">
      {saved && !state.error ? (
        <p role="status" className="mb-8 border border-border-custom px-4 py-3 text-sm text-foreground">
          Saved, and live on the site.
        </p>
      ) : null}

      <Section title="What it is">
        <div>
          <label htmlFor="title" className={label}>Title *</label>
          <input id="title" name="title" required maxLength={120} defaultValue={row.title ?? ""} className={input} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="index" className={label}>Number *</label>
            <input id="index" name="index" required maxLength={8} defaultValue={row.index ?? ""} className={input} />
            <p className={help}>Archive numbering. Stored rather than derived, so adding a project never renumbers the ones already linked to.</p>
          </div>
          <div>
            <label htmlFor="year" className={label}>Year</label>
            <input id="year" name="year" maxLength={20} defaultValue={row.year ?? ""} className={input} />
          </div>
        </div>

        <div>
          <label htmlFor="slug" className={label}>Slug *</label>
          <input
            id="slug"
            name="slug"
            required
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={row.slug ?? ""}
            className={input}
          />
          <p className={help}>The address: /work/&lt;slug&gt;. Changing it breaks any link already shared.</p>
        </div>

        <div>
          <label htmlFor="sector" className={label}>Sector</label>
          <input id="sector" name="sector" maxLength={120} defaultValue={row.sector ?? ""} className={input} />
          <p className={help}>The kind of work, not a client name.</p>
        </div>

        <div>
          <label htmlFor="disciplines" className={label}>Disciplines</label>
          <input
            id="disciplines"
            name="disciplines"
            defaultValue={disciplines.join(", ")}
            className={input}
          />
          <p className={help}>Separated by commas. Shown in the archive and at the top of the study.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="study_type" className={label}>Kind</label>
            <select id="study_type" name="study_type" defaultValue={row.study_type ?? "concept"} className={input}>
              <option value="concept">Concept study</option>
              <option value="client">Client project</option>
            </select>
            <p className={help}>Printed on every card. A visitor should never have to guess whether this was commissioned.</p>
          </div>
          <div>
            <label htmlFor="status" className={label}>Status</label>
            <select id="status" name="status" defaultValue={row.status ?? "placeholder"} className={input}>
              <option value="placeholder">Placeholder</option>
              <option value="real">Real</option>
              <option value="archived">Archived</option>
            </select>
            <p className={help}>The studio&rsquo;s own note. Not shown on the site.</p>
          </div>
        </div>
      </Section>

      <Section
        title="What it says"
        note="Three short paragraphs. Named for what a concept study actually contains — the situation it was set against, the direction taken, and what was made to show it."
      >
        <div>
          <label htmlFor="summary" className={label}>Summary</label>
          <textarea id="summary" name="summary" rows={2} maxLength={400} defaultValue={row.summary ?? ""} className={input} />
          <p className={help}>One line. The archive shows this and nothing more.</p>
        </div>

        {(["scenario", "direction", "demonstration"] as const).map((kind) => (
          <div key={kind}>
            <label htmlFor={kind} className={label}>{kind}</label>
            <textarea
              id={kind}
              name={kind}
              rows={4}
              maxLength={4000}
              defaultValue={sections[kind]}
              className={input}
            />
          </div>
        ))}
      </Section>

      <Section title="What it shows">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="cover_image_id" className={label}>Cover</label>
            <select id="cover_image_id" name="cover_image_id" defaultValue={row.cover_image_id ?? ""} className={input}>
              <option value="">None</option>
              {media.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <p className={help}>The archive and the homepage.</p>
          </div>
          <div>
            <label htmlFor="hero_image_id" className={label}>Hero</label>
            <select id="hero_image_id" name="hero_image_id" defaultValue={row.hero_image_id ?? ""} className={input}>
              <option value="">None</option>
              {media.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <p className={help}>Wide, at the top of the study itself.</p>
          </div>
        </div>

        <fieldset>
          <legend className={label}>Gallery</legend>
          <p className={help}>
            In the order they appear. The first is set wide; the rest sit beside
            it. Alt text describes what is in the picture, for anybody who
            cannot see it.
          </p>

          <ul className="mt-5 space-y-4">
            {rows.map((entry, index) => (
              <li key={index} className="border border-border-custom p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <select
                      name="gallery_media"
                      value={entry.mediaId}
                      onChange={(event) => setRow(index, { mediaId: event.target.value })}
                      aria-label={`Gallery image ${index + 1}`}
                      className={`${input} mt-0`}
                    >
                      <option value="">Choose an image…</option>
                      {media.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>

                    <input
                      name="gallery_alt"
                      value={entry.alt}
                      onChange={(event) => setRow(index, { alt: event.target.value })}
                      aria-label={`Alt text for image ${index + 1}`}
                      placeholder="Alt text"
                      maxLength={300}
                      className={input}
                    />
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="px-2 py-1 font-mono text-xs text-foreground-secondary hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      <span aria-hidden="true">↑</span>
                      <span className="sr-only">Move image {index + 1} up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                      className="px-2 py-1 font-mono text-xs text-foreground-secondary hover:text-foreground disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      <span aria-hidden="true">↓</span>
                      <span className="sr-only">Move image {index + 1} down</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      className="px-2 py-1 font-mono text-xs text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      <span aria-hidden="true">×</span>
                      <span className="sr-only">Remove image {index + 1}</span>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setRows((current) => [...current, { mediaId: "", alt: "" }])}
            className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            Add an image
          </button>
        </fieldset>
      </Section>

      <Section title="On the site">
        <div>
          <label htmlFor="display_order" className={label}>Order</label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            defaultValue={row.display_order ?? 0}
            className={input}
          />
          <p className={help}>Lower numbers come first. The homepage shows the first three.</p>
        </div>

        <div className="flex items-start gap-3">
          <input id="featured" name="featured" type="checkbox" defaultChecked={row.featured} className="mt-1 w-4 h-4" />
          <label htmlFor="featured" className="text-sm text-foreground">Featured</label>
        </div>

        <div className="flex items-start gap-3">
          <input id="published" name="published" type="checkbox" defaultChecked={row.published} className="mt-1 w-4 h-4" />
          <div>
            <label htmlFor="published" className="text-sm text-foreground">Published</label>
            <p className="mt-1 text-sm text-foreground-secondary">
              Unpublished projects stay here and disappear from the site.
            </p>
          </div>
        </div>
      </Section>

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
          href="/admin/projects"
          className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
