"use client";

import React from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { BlurText } from "./BlurText";
import { whenLoaderFinished } from "./loaderSignal";
import { useLenis } from "./LenisScrollProvider";
import { SERVICES } from "@/lib/services";
import { useMagnetic } from "./useMagnetic";

/**
 * The hero, as an editorial spread rather than a landing page.
 *
 * What it used to be: a badge, a headline, a subtitle, a set of coordinates, a
 * category filter and a four-card portfolio grid — an introduction, a showcase
 * and an interface competing in one viewport.
 *
 * Three decisions hold it together now.
 *
 * The headline says what the studio does, not that it is a studio. "Design
 * that connects" was true of every agency that has ever existed; holding
 * together is a claim with a failure state, which is what makes it worth
 * printing.
 *
 * One action. The second link — "Start a project" — asked a visitor who had
 * read one sentence to commit to a project, and split the attention of the one
 * thing they were actually ready to do. Seeing the work is the next step; the
 * contact page is two clicks away and repeated in the nav and the footer.
 *
 * The image is Loomie's own brand sheet, not a case study. Leading with a
 * numbered study spent the first project above the fold and then showed it
 * again in Selected Work a scroll later. The mark on its construction geometry
 * says "this is a studio that draws systems" without borrowing a project to
 * say it, and it is set into the page against a rule rather than framed as a
 * card, because a card would make it look like one more piece of work.
 */

export function HeroSection() {
  const lenis = useLenis();
  const workRef = useMagnetic<HTMLAnchorElement>();

  /**
   * Smooth-scrolls when Lenis is running and otherwise does nothing, which
   * leaves the href to jump natively — the behaviour under reduced motion,
   * where Lenis is deliberately never constructed.
   */
  const toWork = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("work");
    if (!target || !lenis?.current) return;
    event.preventDefault();
    lenis.current.scrollTo(target, { offset: -24 });
  };

  return (
    <section className="relative px-6 md:px-12 max-w-[1700px] mx-auto pt-28 md:pt-32 pb-14 md:pb-20">
      <div className="grid grid-cols-12 gap-y-12 md:gap-x-8 lg:gap-x-12">
        {/* ── Left: who, what, the way in, and the scope ───────────────── */}
        <div className="col-span-12 lg:col-span-7 flex flex-col">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-foreground-secondary">
            Design studio
          </span>

          <BlurText
            as="h1"
            text="Design that holds together."
            trigger="mount"
            waitFor={whenLoaderFinished}
            className="mt-5 font-display font-normal text-[12.5vw] sm:text-[9vw] lg:text-[4.9rem] xl:text-[5.9rem] leading-[0.88] tracking-[-0.03em] text-foreground"
          />

          <p className="mt-7 max-w-lg text-base md:text-lg leading-snug text-foreground-secondary">
            Identity and digital systems that stay coherent wherever the brand
            goes.
          </p>

          <div className="mt-9">
            <a
              ref={workRef}
              href="#work"
              onClick={toWork}
              className="group inline-flex items-baseline gap-3 font-sans text-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              <span className="border-b border-foreground/40 pb-1 transition-colors duration-300 group-hover:border-foreground">
                See selected work
              </span>
              <ArrowDown className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>
          </div>

          {/*
            The scope, in the space the headline leaves.
            Deliberately not links: the navigation already goes to Services,
            and a row of four more things to click beside the one action would
            undo the point of having one action. This is an index, and an index
            is something you read.
          */}
          <ul className="mt-14 lg:mt-auto lg:pt-16 grid grid-cols-2 gap-x-8 max-w-lg">
            {SERVICES.map((service) => (
              <li
                key={service.number}
                className="flex items-baseline gap-3 border-t border-border-custom py-3"
              >
                <span className="font-mono text-[0.65rem] tracking-[0.16em] text-foreground-secondary">
                  {service.number}
                </span>
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-foreground">
                  {service.title}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/*
          ── Right: the studio's own sheet ──────────────────────────────
          Set against a rule and run to the right edge, so it belongs to the
          page's grid rather than sitting on top of it in a panel.
        */}
        <figure className="col-span-12 lg:col-span-5 lg:-mr-6 xl:-mr-12 flex flex-col">
          <div className="border-t border-border-custom pt-4 lg:pr-6 xl:pr-12">
            <figcaption className="flex items-baseline gap-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-foreground-secondary">
              <span className="text-foreground">Identity</span>
              <span className="opacity-40" aria-hidden="true">/</span>
              <span>Digital</span>
              <span className="opacity-40" aria-hidden="true">/</span>
              <span>Web</span>
            </figcaption>
          </div>

          <div className="relative mt-4 aspect-[4/5] sm:aspect-[3/2] lg:aspect-auto lg:flex-1 lg:min-h-[440px]">
            <Image
              src="/images/work/sheet-mark.jpg"
              alt="Loomie's mark drawn on its construction geometry, with the aperture radius and overall measures marked"
              fill
              priority
              quality={84}
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
          </div>
        </figure>
      </div>

      {/* The alignment the page is built on, stated once. */}
      <hr className="mt-14 md:mt-20 border-t border-border-custom" />
    </section>
  );
}
