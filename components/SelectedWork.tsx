"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SELECTED_PROJECTS, STATUS_LABEL, type Project } from "@/lib/projects";

/**
 * The homepage's only portfolio system.
 *
 * It replaces four: a bento grid in the hero, a card stack, a masonry grid
 * and a pinned scroller, each with its own project list and its own idea of
 * what a project card is. Three studies, image first, laid out on an
 * asymmetric rhythm — wide, then narrow and dropped, then wide again — so the
 * page has a shape rather than a row of equal rectangles.
 *
 * No title is set over an image. The previous version put the project name
 * across the photograph in transparent black display type, which is a
 * watermark, and a watermark is what you use when you do not trust the image.
 */

/** Column span, aspect and vertical offset per position in the rhythm. */
const FRAMES = [
  { span: "md:col-span-7", aspect: "aspect-[4/3]", offset: "" },
  { span: "md:col-span-4 md:col-start-9", aspect: "aspect-[3/4]", offset: "md:-mt-24" },
  { span: "md:col-span-8 md:col-start-3", aspect: "aspect-[16/9]", offset: "md:mt-8" },
];

function Study({
  project,
  frame,
  dimmed,
  onFocus,
  onBlur,
}: {
  project: Project;
  frame: (typeof FRAMES)[number];
  dimmed: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  return (
    <article
      className={`col-span-12 ${frame.span} ${frame.offset} transition-opacity duration-[400ms] ${
        dimmed ? "opacity-45" : "opacity-100"
      }`}
    >
      <Link
        href={`/work/${project.slug}`}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        onFocus={onFocus}
        onBlur={onBlur}
        className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        <div className={`relative w-full ${frame.aspect} overflow-hidden bg-surface-card`}>
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            fill
            quality={82}
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
          />
        </div>

        {/* Metadata below the image, where it can be read. */}
        <div className="mt-5 flex items-baseline justify-between gap-6 border-t border-border-custom pt-4">
          <div className="flex items-baseline gap-4 min-w-0">
            <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary shrink-0">
              {project.index}
            </span>
            <h3 className="font-display font-normal text-2xl md:text-3xl leading-none text-foreground truncate">
              {project.title}
            </h3>
          </div>
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary text-right shrink-0">
            {project.sector}
          </span>
        </div>

        {/* The framing, on every card. Placeholder work that does not say it
            is placeholder work is a claim about a client relationship. */}
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-foreground-secondary">
            {STATUS_LABEL[project.status]}
          </span>
        </div>

        <p className="mt-3 max-w-sm text-sm leading-snug text-foreground-secondary">
          {project.summary}
        </p>
      </Link>
    </article>
  );
}

export function SelectedWork() {
  /**
   * Hovering one study quiets the others rather than shouting the active one.
   * Null means nothing is engaged and everything sits at full strength.
   */
  const [engaged, setEngaged] = useState<string | null>(null);

  return (
    <section
      id="work"
      data-selected-work=""
      className="px-6 md:px-12 max-w-[1700px] mx-auto pt-10 md:pt-14 pb-20 md:pb-28"
    >
      <div className="flex items-baseline justify-between gap-8 mb-14 md:mb-20">
        <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          Selected work
        </h2>
        <Link
          href="/work"
          className="font-mono text-xs uppercase tracking-[0.18em] text-foreground-secondary transition-colors duration-300 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          All projects
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-x-8 gap-y-16 md:gap-y-24">
        {SELECTED_PROJECTS.map((project, index) => (
          <Study
            key={project.slug}
            project={project}
            frame={FRAMES[index % FRAMES.length]}
            dimmed={engaged !== null && engaged !== project.slug}
            onFocus={() => setEngaged(project.slug)}
            onBlur={() => setEngaged(null)}
          />
        ))}
      </div>
    </section>
  );
}
