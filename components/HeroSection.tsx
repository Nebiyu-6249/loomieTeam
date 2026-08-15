"use client";

import React, { useCallback, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { BlurText } from "./BlurText";
import { whenLoaderFinished } from "./loaderSignal";
import { useLenis } from "./LenisScrollProvider";
import type { Service } from "@/lib/content-types";
import { useMagnetic } from "./useMagnetic";
import { HeroReel } from "./HeroReel";

/**
 * The hero, as an editorial spread rather than a landing page.
 *
 * The composition is settled: a proposition on the left, the studio's own work
 * on the right, one action, and the scope underneath. What changed is that the
 * two halves are now connected.
 *
 * The service index is the control and the visual is its state: point at
 * Marketing and the object turns to the campaign, point at Website Design and
 * it turns to a built page. That is the studio's argument demonstrated rather
 * than described — a system that answers when you ask it something.
 *
 * The four artefacts are four faces of one turning object rather than four
 * pictures in the same rectangle, because the second reads as a slideshow with
 * a remote control. Seeing the next one arrive and the last one leave is what
 * makes them feel like parts of one practice. HeroReel owns that; this file
 * owns the layout, the index and which service is current.
 *
 * Built as a tablist, which is what this is: four controls selecting one panel.
 * That buys arrow-key navigation and a single tab stop for the whole index
 * rather than four, and it means the image is announced as the thing the
 * controls change rather than as decoration.
 */

export function HeroSection({ services }: { services: Service[] }) {
  const lenis = useLenis();
  const workRef = useMagnetic<HTMLAnchorElement>();

  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Whether the visitor has done anything yet.
   *
   * The reel advances slowly on its own until this is true, so somebody who
   * has not noticed the index is interactive still sees that it moves. The
   * first hover, focus, click or key press ends that permanently — an object
   * that keeps turning after you have taken hold of it is a demo, not a
   * control.
   */
  const [engaged, setEngaged] = useState(false);

  /** Every route into the index goes through here, so nothing can miss it. */
  const choose = useCallback((index: number) => {
    setEngaged(true);
    setActive(index);
  }, []);

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

  /** Roving focus, so the index is one tab stop and the arrows move inside it. */
  const onTabKey = useCallback(
    (event: React.KeyboardEvent, index: number) => {
    const last = services.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    choose(next);
    tabsRef.current[next]?.focus();
    },
    [services.length, choose]
  );

  const current = services[active];

  return (
    <section className="relative px-6 md:px-12 max-w-[1700px] mx-auto pt-28 md:pt-32 pb-12 md:pb-16">
      <div className="grid grid-cols-12 gap-y-10 md:gap-x-8 lg:gap-x-12">
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

          {/* ── The index, which is also the control ────────────────────── */}
          <div
            role="tablist"
            aria-label="Services overview"
            aria-orientation="horizontal"
            className="mt-12 lg:mt-auto lg:pt-12 grid grid-cols-2 gap-x-8 max-w-lg"
          >
            {services.map((service, index) => {
              const selected = index === active;
              return (
                <button
                  key={service.id}
                  ref={(node) => {
                    tabsRef.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`hero-service-${index}`}
                  aria-selected={selected}
                  aria-controls="hero-visual"
                  tabIndex={selected ? 0 : -1}
                  onMouseEnter={() => choose(index)}
                  onFocus={() => choose(index)}
                  onClick={() => choose(index)}
                  onKeyDown={(event) => onTabKey(event, index)}
                  className="group relative flex items-baseline gap-3 border-t border-border-custom py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  {/* Under the row, not on its top rule — on the top rule it
                      reads as underlining the row above. It draws itself in
                      from the left rather than boxing the row, so nothing
                      moves when the selection changes. */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 bottom-0 h-px bg-foreground transition-all duration-[350ms] ease-out ${
                      selected ? "w-full opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                  <span
                    className={`font-mono text-[0.65rem] tracking-[0.16em] transition-colors duration-[350ms] ${
                      selected ? "text-foreground" : "text-foreground-secondary"
                    }`}
                  >
                    {service.number}
                  </span>
                  <span
                    className={`font-mono text-[0.7rem] uppercase tracking-[0.14em] transition-colors duration-[350ms] ${
                      selected
                        ? "text-foreground"
                        : "text-foreground-secondary group-hover:text-foreground"
                    }`}
                  >
                    {service.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/*
          ── Right: the sheet the index is pointing at ──────────────────
          Set against a rule and run to the right edge, so it belongs to the
          page's grid rather than sitting on top of it in a panel.
        */}
        <figure className="col-span-12 lg:col-span-5 lg:-mr-6 xl:-mr-12 lg:-mt-8 flex flex-col">
          <div className="border-t border-border-custom pt-4 lg:pr-6 xl:pr-12">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.18em]">
              {/* Keyed, so the label re-renders rather than cross-fading into
                  a string of the same length. */}
              <span key={current.number} className="text-foreground">
                {current.hero.label}
              </span>
              <span className="normal-case tracking-normal text-foreground-secondary">
                {current.hero.note}
              </span>
            </figcaption>
          </div>

          <HeroReel
            services={services}
            active={active}
            engaged={engaged}
            onIdleAdvance={setActive}
            onSwipe={choose}
            labelledBy={`hero-service-${active}`}
          />
        </figure>
      </div>

      {/* The alignment the page is built on, stated once. */}
      <hr className="mt-10 md:mt-12 border-t border-border-custom" />
    </section>
  );
}
