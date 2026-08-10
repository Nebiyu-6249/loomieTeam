"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LoomieEyes } from "./LoomieEyes";
import { BlurText } from "./BlurText";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A Loomie brand system coming apart and reassembling.
 *
 * Assembled, the six pieces stack into one object. Exploded, they push out on
 * deliberately uneven vectors and name themselves. Locked, they settle into a
 * grid and the labels resolve into the four services. The section demonstrates
 * the thing the studio sells rather than showing a generic product mockup.
 */

interface Piece {
  id: string;
  /** Named while exploded. */
  label: string;
  /** Named once locked. Four service names across six pieces. */
  service: string;
  /** Explode vector as a fraction of the stage box. Deliberately asymmetric. */
  explode: { x: number; y: number; rotate: number; scale: number };
  /** Column and row in the locked 3 x 2 grid. */
  cell: { column: number; row: number };
  render: React.ReactNode;
}

const SWATCH_TONES = [
  "bg-background",
  "bg-surface",
  "bg-surface-card",
  "bg-foreground-secondary",
  "bg-foreground",
];

const PIECES: Piece[] = [
  {
    id: "mark",
    label: "The mark",
    service: "Logo design",
    explode: { x: -0.34, y: -0.26, rotate: -9, scale: 1.12 },
    cell: { column: 0, row: 0 },
    render: (
      <div className="h-full w-full flex items-center justify-center p-5">
        <LoomieEyes track={false} className="w-3/4 h-auto" />
      </div>
    ),
  },
  {
    id: "colour",
    label: "Colour",
    service: "Web brand identity",
    explode: { x: 0.31, y: -0.33, rotate: 7, scale: 0.94 },
    cell: { column: 1, row: 0 },
    render: (
      <div className="h-full w-full flex flex-col justify-between p-5">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-foreground-secondary">
          Palette
        </span>
        <div className="flex h-1/2 border border-border-custom">
          {SWATCH_TONES.map((tone) => (
            <div key={tone} className={`flex-1 ${tone}`} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "type",
    label: "Type",
    service: "Web brand identity",
    explode: { x: -0.38, y: 0.19, rotate: 5, scale: 1.04 },
    cell: { column: 2, row: 0 },
    render: (
      <div className="h-full w-full flex flex-col justify-between p-5">
        <span className="font-mono text-[0.6rem] uppercase tracking-widest text-foreground-secondary">
          Specimen
        </span>
        <span className="font-sans font-black text-2xl md:text-3xl tracking-tighter uppercase text-foreground leading-none">
          Loomie
        </span>
        <span className="font-mono text-[0.6rem] tracking-widest text-foreground-secondary">
          Aa Bb Cc 0123
        </span>
      </div>
    ),
  },
  {
    id: "packaging",
    label: "Packaging",
    service: "Marketing design",
    explode: { x: 0.26, y: 0.31, rotate: -12, scale: 0.9 },
    cell: { column: 0, row: 1 },
    render: (
      <div className="h-full w-full p-5">
        <div className="h-full w-full border border-border-custom flex flex-col justify-between p-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-widest text-foreground-secondary">
            Label
          </span>
          <div className="flex items-end justify-between">
            <span className="font-sans font-black text-sm uppercase tracking-tight text-foreground">
              Loomie
            </span>
            <div className="flex gap-[2px] items-end h-5">
              {[3, 5, 2, 5, 3, 4, 2].map((height, index) => (
                <span
                  key={index}
                  className="w-[2px] bg-foreground"
                  style={{ height: `${height * 20}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "social",
    label: "Social",
    service: "Marketing design",
    explode: { x: 0.06, y: -0.4, rotate: 14, scale: 0.86 },
    cell: { column: 1, row: 1 },
    render: (
      <div className="h-full w-full p-5 flex items-center justify-center">
        <div className="aspect-square h-full border border-border-custom flex flex-col items-center justify-center gap-2">
          <LoomieEyes track={false} className="w-8 h-auto" />
          <span className="font-mono text-[0.55rem] uppercase tracking-widest text-foreground-secondary">
            Post 01
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "interface",
    label: "Interface",
    service: "Website design",
    explode: { x: -0.12, y: 0.38, rotate: -6, scale: 1 },
    cell: { column: 2, row: 1 },
    render: (
      <div className="h-full w-full p-5 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-foreground-secondary" />
          <span className="w-1.5 h-1.5 bg-foreground-secondary" />
          <span className="w-1.5 h-1.5 bg-foreground-secondary" />
        </div>
        <div className="h-2 w-3/4 bg-foreground" />
        <div className="h-1.5 w-full bg-border-custom" />
        <div className="h-1.5 w-5/6 bg-border-custom" />
        <div className="mt-auto h-5 w-1/2 bg-foreground" />
      </div>
    ),
  },
];

/** Fractions of the stage box used for the locked 3 x 2 grid. */
const COLUMN_SPREAD = 0.32;
const ROW_SPREAD = 0.26;

export function ExplodedView() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pieceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const serviceRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      // Desktop: pinned scrub through assembled, exploded and locked.
      mm.add(
        "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        () => {
          const stage = stageRef.current;
          const section = sectionRef.current;
          if (!stage || !section) return;

          const pieces = pieceRefs.current.filter(Boolean) as HTMLDivElement[];
          const labels = labelRefs.current.filter(Boolean) as HTMLSpanElement[];
          const services = serviceRefs.current.filter(
            Boolean
          ) as HTMLSpanElement[];
          if (pieces.length === 0) return;

          // Measured through function-based values so invalidateOnRefresh can
          // recompute them when the viewport changes.
          const box = () => stage.getBoundingClientRect();

          gsap.set(pieces, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
          gsap.set(labels, { opacity: 0 });
          gsap.set(services, { opacity: 0 });

          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "+=180%",
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });

          // Assembled -> exploded.
          timeline.to(
            pieces,
            {
              x: (index: number) => PIECES[index].explode.x * box().width,
              y: (index: number) => PIECES[index].explode.y * box().height,
              rotate: (index: number) => PIECES[index].explode.rotate,
              scale: (index: number) => PIECES[index].explode.scale,
              ease: "power2.inOut",
              duration: 1,
            },
            0
          );

          timeline.to(labels, { opacity: 1, duration: 0.35 }, 0.45);

          // Exploded -> locked grid.
          timeline.to(
            pieces,
            {
              x: (index: number) =>
                (PIECES[index].cell.column - 1) * COLUMN_SPREAD * box().width,
              y: (index: number) =>
                (PIECES[index].cell.row - 0.5) * 2 * ROW_SPREAD * box().height,
              rotate: 0,
              scale: 1,
              ease: "power2.inOut",
              duration: 1,
            },
            1
          );

          timeline.to(labels, { opacity: 0, duration: 0.25 }, 1.15);
          timeline.to(services, { opacity: 1, duration: 0.25 }, 1.35);
        }
      );

      // Mobile: no pin, no scroll capture. The pieces simply arrive in order.
      mm.add(
        "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
        () => {
          const pieces = pieceRefs.current.filter(Boolean) as HTMLDivElement[];
          const services = serviceRefs.current.filter(
            Boolean
          ) as HTMLSpanElement[];
          if (pieces.length === 0) return;

          gsap.set(labelRefs.current.filter(Boolean), { opacity: 0 });
          gsap.set(services, { opacity: 1 });

          gsap.fromTo(
            pieces,
            { opacity: 0, y: 32, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.12,
              ease: "power3.out",
              scrollTrigger: {
                trigger: stageRef.current,
                start: "top 85%",
                once: true,
              },
            }
          );
        }
      );
    }, sectionRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-exploded-section=""
      className="relative border-t border-border-custom"
    >
      <div
        className={`flex flex-col justify-center px-6 md:px-12 max-w-[1700px] mx-auto py-24 ${
          prefersReducedMotion ? "" : "md:h-screen md:py-0"
        }`}
      >
        <header className="shrink-0">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-foreground-secondary block mb-3">
            00 / Brand system
          </span>
          <BlurText
            as="h2"
            text="One system carrying a single idea all the way through"
            className="block text-2xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase text-foreground max-w-4xl"
          />
        </header>

        {/*
          Mobile is a plain 2-column grid. From md up the pieces are absolutely
          centred and GSAP owns their transforms; the centring is done with
          xPercent/yPercent rather than a translate class so nothing competes
          for the transform property.
        */}
        <div
          ref={stageRef}
          className={
            prefersReducedMotion
              ? "mt-10 grid grid-cols-2 md:grid-cols-3 gap-5"
              : "relative mt-10 md:mt-8 grid grid-cols-2 gap-5 md:block md:flex-1 md:min-h-0"
          }
        >
          {PIECES.map((piece, index) => (
            <div
              key={piece.id}
              data-piece={piece.id}
              ref={(el) => {
                pieceRefs.current[index] = el;
              }}
              style={
                prefersReducedMotion
                  ? undefined
                  : { zIndex: PIECES.length - index }
              }
              className={
                prefersReducedMotion
                  ? ""
                  : "md:absolute md:left-1/2 md:top-1/2 md:w-[26%] md:max-w-[280px]"
              }
            >
              <div className="w-full aspect-[5/4] bg-surface-card border border-border-custom rounded-none overflow-hidden">
                {piece.render}
              </div>

              {prefersReducedMotion ? (
                <div className="mt-2 h-4">
                  <span className="font-mono text-[0.6rem] md:text-xs uppercase tracking-widest text-foreground font-bold">
                    {piece.service}
                  </span>
                </div>
              ) : (
                <div className="relative mt-2 h-4">
                  <span
                    data-piece-label=""
                    ref={(el) => {
                      labelRefs.current[index] = el;
                    }}
                    className="absolute inset-x-0 top-0 font-mono text-[0.6rem] md:text-xs uppercase tracking-widest text-foreground-secondary"
                  >
                    {piece.label}
                  </span>
                  <span
                    data-piece-service=""
                    ref={(el) => {
                      serviceRefs.current[index] = el;
                    }}
                    className="absolute inset-x-0 top-0 font-mono text-[0.6rem] md:text-xs uppercase tracking-widest text-foreground font-bold"
                  >
                    {piece.service}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
