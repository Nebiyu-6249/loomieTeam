"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { STATUS_LABEL, type Project } from "@/lib/projects";

/**
 * A case study, set as an article rather than a dashboard.
 *
 * The previous version opened with "Case Study / 2026" over a numbered
 * three-part structure — The Challenge, The Solution, The Impact — each
 * carrying a paragraph that announced itself as placeholder. The structure is
 * the same because it is the right structure; the labels are quieter and the
 * copy is now written to be read.
 */

const PARTS = [
  { key: "brief", label: "Brief" },
  { key: "approach", label: "Approach" },
  { key: "outcome", label: "Outcome" },
] as const;

export function CaseStudyClient({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  return (
    <div>
      <section className="pt-32 md:pt-40 px-6 md:px-12 max-w-[1700px] mx-auto">
        <div className="grid grid-cols-12 gap-x-8 gap-y-8 items-end">
          <div className="col-span-12 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary">
              <span>
                {project.index} — {project.sector}
              </span>
              {/* Said at the top, not in a footnote. A visitor should know
                  what they are reading before they read it. */}
              <span className="border border-border-custom px-2 py-1 text-foreground">
                {STATUS_LABEL[project.status]}
              </span>
            </div>
            <h1 className="mt-5 font-display font-normal text-[13vw] sm:text-7xl lg:text-8xl leading-[0.88] tracking-[-0.03em] text-foreground">
              {project.title}
            </h1>
          </div>

          <dl className="col-span-12 lg:col-span-4 lg:col-start-9 flex flex-wrap gap-x-10 gap-y-4 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
            <div>
              <dt className="text-foreground-secondary">Year</dt>
              <dd className="mt-1 text-foreground">{project.year}</dd>
            </div>
            <div>
              <dt className="text-foreground-secondary">Disciplines</dt>
              <dd className="mt-1 text-foreground">{project.disciplines.join(" · ")}</dd>
            </div>
          </dl>
        </div>

        <div className="relative mt-12 md:mt-16 w-full aspect-[16/9] overflow-hidden bg-surface-card">
          <Image
            src={project.hero.src}
            alt={project.hero.alt}
            fill
            priority
            quality={84}
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto py-16 md:py-22">
        <div className="grid grid-cols-12 gap-x-8 gap-y-12">
          {PARTS.map((part) => (
            <div key={part.key} className="col-span-12 md:col-span-4">
              <h2 className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary">
                {part.label}
              </h2>
              <p className="mt-4 text-base leading-snug text-foreground-secondary max-w-sm">
                {project[part.key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-16 md:pb-20">
        <div className="grid grid-cols-12 gap-8">
          {project.gallery.map((image, index) => (
            <figure
              key={image.src + index}
              className={index === 0 ? "col-span-12 md:col-span-8" : "col-span-12 md:col-span-4"}
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-surface-card">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  loading="lazy"
                  quality={80}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                />
              </div>
            </figure>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-20 md:pb-24">
        <Link
          href={`/work/${next.slug}`}
          className="group grid grid-cols-12 items-center gap-8 border-t border-border-custom pt-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <div className="col-span-12 md:col-span-7">
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary">
              Next
            </span>
            <h2 className="mt-3 flex items-center gap-4 font-display font-normal text-4xl md:text-6xl leading-none text-foreground">
              {next.title}
              <ArrowUpRight className="w-6 h-6 shrink-0 transition-transform duration-[250ms] group-hover:translate-x-1 group-hover:-translate-y-1" />
            </h2>
          </div>

          <div className="col-span-12 md:col-span-4 md:col-start-9">
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-surface-card">
              <Image
                src={next.cover.src}
                alt={next.cover.alt}
                fill
                loading="lazy"
                quality={78}
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}
