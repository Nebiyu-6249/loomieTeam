"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import type { Service } from "@/lib/content-types";

/**
 * What the studio does, as a chapter rather than a second gallery.
 *
 * The problem this replaces: four images with small captions, arriving
 * immediately after a work archive that is also four images with small
 * captions. Nothing told the visitor they had moved from "here is what we
 * made" to "here is what we do", so the middle of the homepage went flat
 * between the archive and Snow → River → Light, and then the page suddenly
 * became cinematic again with no bridge.
 *
 * So the grammar changes rather than the decoration. Work is an archive you
 * read down. This is a stage: the four services stay listed on the left, one
 * of them is the current chapter, and a single frame on the right shows what
 * that chapter produces. Scrolling moves through them.
 *
 * ── Why sticky rather than a pin ──────────────────────────────────────────
 * The composition holds with CSS `position: sticky`, and ScrollTrigger only
 * reads how far through the section the visitor is. Nothing is pinned, no
 * scroll is captured, no wheel event is intercepted: a flick of the wheel
 * moves the page exactly as far as it would anywhere else, and the four states
 * happen on the way past. The section is two viewports tall, one of which is
 * the stage itself, so the whole progression costs about one screen of extra
 * scrolling rather than the three a pinned sequence would want.
 *
 * ── The handoff ──────────────────────────────────────────────────────────
 * Over the last stretch the stage cools and dissolves: the visual loses its
 * detail, a cold wash comes up underneath, and the section hands over to Snow
 * without a rule between them. That is a fade, not a transition — nothing is
 * drawn on top, nothing is pinned, and the state section that follows is
 * untouched.
 */

/** Long enough to read as a chapter turning, short enough not to be waited on. */
const SWAP = 0.52;

/** Where the stage starts cooling into the section that follows. */
const HANDOFF_AT = 0.84;

/* ── The stacked reading, used on phones and under reduced motion ───────── */

function StackedService({ service }: { service: Service }) {
  return (
    <li className="border-t border-border-custom pt-6 pb-10">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
          {service.number}
        </span>
        <h3 className="font-display font-normal text-3xl leading-none text-foreground">
          {service.title}
        </h3>
      </div>

      <div className="relative mt-5 aspect-square overflow-hidden bg-surface-card">
        <Image
          src={service.image.src}
          alt={service.image.alt}
          fill
          quality={80}
          loading="lazy"
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="object-contain p-4"
        />
      </div>

      <p className="mt-4 max-w-sm text-sm leading-snug text-foreground-secondary">
        {service.summary}
      </p>
    </li>
  );
}

function Intro() {
  return (
    <div className="max-w-xl">
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary">
        What we do
      </h2>
      <p className="mt-4 text-base md:text-lg leading-snug text-foreground-secondary">
        Four ways one system moves through a brand.
      </p>
    </div>
  );
}

/**
 * Whether the viewport is wide enough for the stage.
 *
 * Subscribed rather than measured in an effect: a width is something the
 * server cannot know and the client can change at any moment, which is exactly
 * what useSyncExternalStore is for. Measuring it in an effect and calling
 * setState is the pattern the React Compiler rejects, and it is right to.
 */
const WIDE = "(min-width: 1024px)";
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const readWide = () => window.matchMedia(WIDE).matches;
/** The server renders the stacked reading, which is the honest default. */
const readWideServer = () => false;

export function ServicesSection({
  services,
  /** Set on the homepage, where Snow → River → Light follows this section. */
  bridgeToState = false,
}: {
  services: Service[];
  bridgeToState?: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const wide = useSyncExternalStore(subscribeWide, readWide, readWideServer);

  /**
   * The stage is the enhancement. The server sends the stacked reading, and a
   * phone, a reduced-motion visitor and a JavaScript failure all keep it —
   * four services, four visuals, four sentences, in order, with nothing
   * depending on scrolling.
   */
  const stage = wide && !prefersReducedMotion;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const platesRef = useRef<(HTMLDivElement | null)[]>([]);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const previous = useRef(0);

  const [active, setActive] = useState(0);

  /* ── Scroll decides the chapter ───────────────────────────────────────── */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !stage) return;

    gsap.registerPlugin(ScrollTrigger);

    // Written straight to the DOM rather than through state: this runs on
    // every scroll frame, and re-rendering four times a frame to change one
    // opacity is how a section like this ends up costing more than the rest of
    // the page put together.
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const index = Math.min(
          services.length - 1,
          Math.floor(self.progress * services.length)
        );
        if (index !== previous.current) setActive(index);

        if (!bridgeToState) return;

        // The cool-down into the section below.
        const exit = Math.min(
          Math.max((self.progress - HANDOFF_AT) / (1 - HANDOFF_AT), 0),
          1
        );
        if (stageRef.current) {
          stageRef.current.style.opacity = String(1 - exit * 0.92);
        }
        if (washRef.current) {
          washRef.current.style.opacity = String(exit * 0.7);
        }
      },
    });

    return () => trigger.kill();
  }, [bridgeToState, stage, services.length]);

  /* ── The visual answers ───────────────────────────────────────────────── */
  useEffect(() => {
    const from = previous.current;
    previous.current = active;
    if (from === active) return;

    const outgoing = platesRef.current[from];
    const incoming = platesRef.current[active];
    if (!incoming) return;

    if (outgoing) {
      gsap.to(outgoing, {
        autoAlpha: 0,
        y: -16,
        scale: 0.99,
        duration: SWAP,
        ease: "power3.out",
      });
    }
    gsap.fromTo(
      incoming,
      { autoAlpha: 0, y: 16, scale: 1.01 },
      { autoAlpha: 1, y: 0, scale: 1, duration: SWAP, ease: "power3.out" }
    );
  }, [active]);

  /** Roving focus: the list is one tab stop and the arrows move inside it. */
  const onKey = useCallback(
    (event: React.KeyboardEvent, index: number) => {
    const last = services.length - 1;
    let next: number | null = null;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;
    event.preventDefault();
    setActive(next);
    buttonsRef.current[next]?.focus();
    },
    [services.length]
  );

  /**
   * The section element itself never unmounts — only its children swap.
   *
   * Returning two different subtrees from two different components put a
   * remount at this position in the tree, and on the homepage the section
   * immediately below is pinned by ScrollTrigger, which moves the pinned node
   * into a pin-spacer of its own making. React then tried to reconcile against
   * sibling references GSAP had already invalidated and threw
   * "insertBefore: the node ... is not a child of this node", taking the whole
   * section out of the document. A stable outer node keeps the reconciliation
   * inside this component, where nothing else is rearranging the DOM.
   */
  if (!stage) {
    return (
      <section
        id="services"
        ref={sectionRef}
        className="px-6 md:px-12 max-w-[1700px] mx-auto py-14 md:py-20 border-t border-border-custom"
      >
        <Intro />
        <ul className="mt-12">
          {services.map((service) => (
            <StackedService key={service.id} service={service} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      id="services"
      ref={sectionRef}
      /* Two viewports: one is the stage, the other is the scroll that moves
         through it. Anything longer and this becomes a sequence to sit out. */
      className="relative h-[200vh] border-t border-border-custom"
    >
      <div ref={stageRef} className="sticky top-0 h-screen overflow-hidden">
        {/* The cold ground the section hands over to. Behind everything, and
            at zero until the last stretch. */}
        {bridgeToState && (
          <div
            ref={washRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--bg-cold)_92%)]"
          />
        )}

        <div className="relative h-full px-6 md:px-12 max-w-[1700px] mx-auto flex flex-col justify-center py-16">
          <Intro />

          <div className="mt-10 grid grid-cols-12 gap-x-8 xl:gap-x-12 items-center">
            {/* ── Left: the four chapters, all of them visible ──────────── */}
            <ul
              role="tablist"
              aria-label="What we do"
              aria-orientation="vertical"
              className="col-span-5"
            >
              {services.map((service, index) => {
                const selected = index === active;
                return (
                  <li key={service.id} role="presentation">
                    <button
                      ref={(node) => {
                        buttonsRef.current[index] = node;
                      }}
                      type="button"
                      role="tab"
                      id={`service-${index}`}
                      aria-selected={selected}
                      aria-controls="service-stage"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onKeyDown={(event) => onKey(event, index)}
                      /* Fixed height, so the active title can be genuinely
                         larger without the rows below it moving. */
                      className="group relative w-full text-left border-t border-border-custom h-[112px] xl:h-[124px] flex flex-col justify-center pl-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-px bg-foreground transition-all duration-[450ms] ease-out ${
                          selected ? "h-10 opacity-100" : "h-0 opacity-0"
                        }`}
                      />

                      <div className="flex items-baseline gap-4">
                        <span
                          className={`font-mono text-[0.7rem] tracking-[0.16em] transition-colors duration-[450ms] ${
                            selected ? "text-foreground" : "text-foreground-secondary/60"
                          }`}
                        >
                          {service.number}
                        </span>
                        <h3
                          className={`font-display font-normal leading-none transition-all duration-[450ms] ease-out ${
                            selected
                              ? "text-4xl xl:text-5xl text-foreground"
                              : "text-2xl xl:text-3xl text-foreground-secondary/55"
                          }`}
                        >
                          {service.title}
                        </h3>
                      </div>

                      {/* Always in the DOM and always occupying its line, so
                          the sentence is readable to a screen reader whatever
                          the scroll is doing and nothing reflows when it
                          appears. */}
                      <p
                        className={`mt-3 max-w-sm text-sm leading-snug text-foreground-secondary transition-opacity duration-[450ms] ${
                          selected ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        {service.summary}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* ── Right: one frame, showing the current chapter ─────────── */}
            <div
              id="service-stage"
              role="tabpanel"
              aria-labelledby={`service-${active}`}
              className="col-span-7 relative aspect-[4/3] overflow-hidden bg-surface-card"
            >
              {services.map((service, index) => (
                <div
                  key={service.id}
                  ref={(node) => {
                    platesRef.current[index] = node;
                  }}
                  className="absolute inset-0"
                  style={
                    index === active ? undefined : { opacity: 0, visibility: "hidden" }
                  }
                >
                  <Image
                    src={service.image.src}
                    alt={index === active ? service.image.alt : ""}
                    fill
                    quality={82}
                    loading="lazy"
                    sizes="58vw"
                    className="object-contain p-5 xl:p-8"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
