"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { STUDY_LABEL, type Project } from "@/lib/content-types";

/**
 * The work index.
 *
 * There is no filter bar. Five projects do not need faceted search, and the
 * previous version gave a third of the page to a row of pill buttons — six
 * controls above eight items, which is a content management screen rather
 * than a portfolio. Sector is printed against each entry instead, where it is
 * information rather than an interface.
 *
 * Alternating alignment gives the column a rhythm without changing the frame
 * size, so the page reads as a considered list rather than a grid that ran
 * out of ideas.
 */

export function ProjectArchive({ projects }: { projects: Project[] }) {
  const [engaged, setEngaged] = useState<string | null>(null);

  return (
    <section className="px-6 md:px-12 max-w-[1700px] mx-auto pb-20 md:pb-24">
      <ol className="mt-12 md:mt-16">
        {projects.map((project, index) => {
          const flipped = index % 2 === 1;
          const dimmed = engaged !== null && engaged !== project.slug;

          return (
            <li
              key={project.slug}
              className={`border-t border-border-custom transition-opacity duration-[400ms] ${
                dimmed ? "opacity-45" : "opacity-100"
              }`}
            >
              <Link
                href={`/work/${project.slug}`}
                onMouseEnter={() => setEngaged(project.slug)}
                onMouseLeave={() => setEngaged(null)}
                onFocus={() => setEngaged(project.slug)}
                onBlur={() => setEngaged(null)}
                className="group grid grid-cols-12 items-center gap-x-8 gap-y-6 py-7 md:py-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <div
                  className={`col-span-12 md:col-span-5 ${
                    flipped ? "md:order-2 md:col-start-8" : "md:order-1"
                  }`}
                >
                  <div className="relative w-full aspect-[16/10] overflow-hidden bg-surface-card">
                    <Image
                      src={project.cover.src}
                      alt={project.cover.alt}
                      fill
                      quality={80}
                      loading={index < 2 ? undefined : "lazy"}
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
                    />
                  </div>
                </div>

                <div
                  className={`col-span-12 md:col-span-6 ${
                    flipped ? "md:order-1 md:col-start-1" : "md:order-2 md:col-start-7"
                  }`}
                >
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
                      {project.index}
                    </span>
                    <h2 className="font-display font-normal text-3xl md:text-5xl leading-none tracking-[-0.02em] text-foreground">
                      {project.title}
                    </h2>
                  </div>

                  <p className="mt-4 max-w-md text-sm md:text-base leading-snug text-foreground-secondary">
                    {project.summary}
                  </p>

                  <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
                    <div className="flex gap-2">
                      <dt className="sr-only">Sector</dt>
                      <dd>{project.sector}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Disciplines</dt>
                      <dd>{project.disciplines.join(" · ")}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Year</dt>
                      <dd>{project.year}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="sr-only">Status</dt>
                      <dd className="text-foreground">{STUDY_LABEL[project.studyType]}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
