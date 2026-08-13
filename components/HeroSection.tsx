"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlurText } from "./BlurText";
import { whenLoaderFinished } from "./loaderSignal";
import { HERO_PROJECT } from "@/lib/projects";
import { useMagnetic } from "./useMagnetic";

/**
 * The hero, as an editorial spread rather than a landing page.
 *
 * What it used to be: a badge, a headline, a subtitle, a set of coordinates,
 * a category filter and a four-card portfolio grid — an introduction, a
 * showcase and an interface competing in one viewport.
 *
 * What it is now: a name, a proposition, a way in, and one photograph. The
 * headline sits low and left against a deep column of space rather than
 * centred in an empty viewport, the image runs to the right edge, and the
 * rule between them is the only alignment the page needs to declare.
 *
 * The coordinates are gone. They were a set of digits for Mumbai on the site
 * of a studio that says it works from Tokyo, London and New York, which is
 * the problem with decorative telemetry: it is either meaningless or wrong.
 */

const LEAD = HERO_PROJECT;

export function HeroSection() {
  const workRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section className="relative px-6 md:px-12 max-w-[1700px] mx-auto pt-28 md:pt-32 pb-14 md:pb-20">
      <div className="grid grid-cols-12 gap-y-12 md:gap-x-8 lg:gap-x-12">
        {/* ── Left column: who, what, and the way in ──────────────────── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-center">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground-secondary">
            Design studio
          </span>

          <BlurText
            as="h1"
            text="Design that connects"
            trigger="mount"
            waitFor={whenLoaderFinished}
            className="mt-5 font-display font-normal text-[14vw] sm:text-[10vw] lg:text-[5.4rem] xl:text-[6.4rem] leading-[0.86] tracking-[-0.03em] text-foreground"
          />

          <p className="mt-7 max-w-md text-base md:text-lg leading-snug text-foreground-secondary">
            Identity, websites and the system that keeps them the same thing.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              ref={workRef}
              href="/work"
              className="group inline-flex items-baseline gap-3 font-sans text-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 group-hover:border-foreground">
                See the work
              </span>
              <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              href="/contact"
              className="font-mono text-xs uppercase tracking-[0.18em] text-foreground-secondary transition-colors duration-300 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              Start a project
            </Link>
          </div>
        </div>

        {/*
          ── Right column: one photograph ───────────────────────────────
          A material detail rather than a hero banner, captioned like a plate
          in a book. It is the first piece of work the visitor sees, and it
          runs past the grid to the right edge so the page has one open side.
        */}
        <figure className="col-span-12 lg:col-span-5 lg:-mr-6 xl:-mr-12">
          <Link
            href={`/work/${LEAD.slug}`}
            className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            <div className="relative aspect-[4/5] lg:aspect-auto lg:h-[58vh] lg:min-h-[420px] overflow-hidden bg-surface-card">
              <Image
                src={LEAD.cover.src}
                alt={LEAD.cover.alt}
                fill
                priority
                quality={82}
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.02]"
              />
            </div>

            <figcaption className="mt-4 lg:pr-6 xl:pr-12 flex items-baseline justify-between gap-6 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground-secondary">
              <span className="text-foreground">
                {LEAD.index} — {LEAD.title}
              </span>
              <span>{LEAD.sector}</span>
            </figcaption>
          </Link>
        </figure>
      </div>

      {/* The alignment the page is built on, stated once. */}
      <hr className="mt-14 md:mt-20 border-t border-border-custom" />
    </section>
  );
}
