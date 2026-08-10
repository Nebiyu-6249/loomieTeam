"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CardSwap, Card } from "./CardSwap";
import { BlurText } from "./BlurText";
import { useMagnetic } from "./useMagnetic";

/**
 * Featured work, one card per case study.
 *
 * The data is passed in from the server page rather than imported here, so
 * the case study route module and everything it pulls in stays out of the
 * client bundle.
 *
 * Each card is covered by a stretched Link rather than wired through
 * CardSwap's onCardClick. That gives a real anchor: crawlable, native
 * keyboard handling, and middle-clickable. CardSwap still implements the
 * onCardClick button semantics for consumers that have no URL to point at.
 */

export interface FeaturedProject {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  services: string[];
}

export function FeaturedWork({ projects }: { projects: FeaturedProject[] }) {
  const seeAllRef = useMagnetic<HTMLAnchorElement>();

  return (
    <section
      data-featured-section=""
      className="py-24 md:py-32 px-6 md:px-12 max-w-[1700px] mx-auto border-t border-border-custom"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-3">
            Featured
          </span>

          <BlurText
            as="h2"
            text="Featured work"
            className="block font-display font-normal text-4xl md:text-6xl tracking-[-0.02em] text-foreground"
          />

          <Link
            ref={seeAllRef}
            href="/work"
            className="inline-flex items-center gap-3 mt-8 px-7 py-3.5 rounded-none bg-foreground text-background font-bold text-sm uppercase tracking-wider transition-colors duration-300 hover:bg-surface-card hover:text-foreground border border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <span>See all work</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          <CardSwap delay={4500} pauseOnHover skewAmount={4} easing="elastic">
            {projects.map((project) => (
              <Card
                key={project.slug}
                className="group relative p-7 lg:p-8 flex flex-col justify-between aspect-[4/3] transition-colors duration-300 hover:border-foreground focus-within:border-foreground"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[0.65rem] uppercase tracking-widest text-foreground-secondary">
                    {project.year} / {project.services[0]}
                  </span>
                  <ArrowUpRight className="w-5 h-5 shrink-0 text-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>

                <div>
                  <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight text-foreground leading-tight">
                    {/* Stretched link: the whole card is the hit area, but the
                        semantics and keyboard behaviour are a plain anchor. */}
                    <Link
                      href={`/work/${project.slug}`}
                      className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      {project.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-foreground-secondary leading-relaxed">
                    {project.subtitle}
                  </p>
                </div>
              </Card>
            ))}
          </CardSwap>
        </div>
      </div>
    </section>
  );
}
