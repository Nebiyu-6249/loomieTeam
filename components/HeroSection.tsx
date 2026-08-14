"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { gsap } from "gsap";
import { BlurText } from "./BlurText";
import { whenLoaderFinished } from "./loaderSignal";
import { useLenis } from "./LenisScrollProvider";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { Service } from "@/lib/content-types";
import { useMagnetic } from "./useMagnetic";

/**
 * The hero, as an editorial spread rather than a landing page.
 *
 * The composition is settled: a proposition on the left, the studio's own work
 * on the right, one action, and the scope underneath. What changed is that the
 * two halves are now connected.
 *
 * The service index used to be a list of four words next to a picture of a
 * logo, and the two had nothing to do with each other. It is now the control
 * and the picture is its state: point at Marketing and the sheet becomes the
 * campaign, point at Websites and it becomes a built page. That is the studio's
 * argument demonstrated rather than described — a system that answers when you
 * ask it something.
 *
 * Built as a tablist, which is what this is: four controls selecting one panel.
 * That buys arrow-key navigation and a single tab stop for the whole index
 * rather than four, and it means the image is announced as the thing the
 * controls change rather than as decoration.
 */

/** Long enough to read as a page turning, short enough not to be waited on. */
const SWAP = 0.42;

export function HeroSection({ services }: { services: Service[] }) {
  const lenis = useLenis();
  const prefersReducedMotion = usePrefersReducedMotion();
  const workRef = useMagnetic<HTMLAnchorElement>();

  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const platesRef = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const previous = useRef(0);

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

  /**
   * The swap: the outgoing sheet lifts and goes, the incoming one arrives from
   * just below. Six pixels, because the movement is there to give the change a
   * direction, not to be noticed on its own.
   */
  useEffect(() => {
    const from = previous.current;
    previous.current = active;
    if (from === active) return;

    const outgoing = platesRef.current[from];
    const incoming = platesRef.current[active];
    if (!incoming) return;

    if (prefersReducedMotion) {
      if (outgoing) gsap.set(outgoing, { autoAlpha: 0, y: 0 });
      gsap.set(incoming, { autoAlpha: 1, y: 0 });
      return;
    }

    if (outgoing) {
      gsap.to(outgoing, { autoAlpha: 0, y: -6, duration: SWAP, ease: "power3.out" });
    }
    gsap.fromTo(
      incoming,
      { autoAlpha: 0, y: 6 },
      { autoAlpha: 1, y: 0, duration: SWAP, ease: "power3.out" }
    );
  }, [active, prefersReducedMotion]);

  /**
   * Optical depth, not a tilt.
   *
   * Three pixels of travel and a third of a degree: enough that the sheet reads
   * as a physical thing catching the light, not enough to register as an
   * effect. Off entirely for reduced motion and for anything without a real
   * pointer, where there is no hover to respond to and the handler would only
   * fire on touch.
   */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || prefersReducedMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const moveX = gsap.quickTo(frame, "x", { duration: 0.8, ease: "power3.out" });
    const moveY = gsap.quickTo(frame, "y", { duration: 0.8, ease: "power3.out" });
    const tilt = gsap.quickTo(frame, "rotation", { duration: 0.9, ease: "power3.out" });

    const onMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      moveX(x * 6);
      moveY(y * 4);
      tilt(x * 0.34);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.to(frame, { x: 0, y: 0, rotation: 0, duration: 0.4 });
    };
  }, [prefersReducedMotion]);

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
    setActive(next);
    tabsRef.current[next]?.focus();
    },
    [services.length]
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
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
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

          <div
            ref={frameRef}
            id="hero-visual"
            role="tabpanel"
            aria-labelledby={`hero-service-${active}`}
            className="relative mt-4 aspect-[4/5] sm:aspect-[3/2] lg:aspect-auto lg:flex-1 lg:min-h-[470px] will-change-transform"
          >
            {services.map((service, index) => (
              <div
                key={service.id}
                ref={(node) => {
                  platesRef.current[index] = node;
                }}
                className="absolute inset-0"
                style={
                  index === active
                    ? undefined
                    : { opacity: 0, visibility: "hidden" }
                }
              >
                <Image
                  src={service.hero.src}
                  alt={index === active ? service.hero.alt : ""}
                  fill
                  priority={index === 0}
                  quality={82}
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </figure>
      </div>

      {/* The alignment the page is built on, stated once. */}
      <hr className="mt-10 md:mt-12 border-t border-border-custom" />
    </section>
  );
}
