"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Five stages, shown as something narrowing rather than five text columns.
 *
 * Each stage draws its own diagram: scattered marks at discovery, sorted into
 * bands at research, two routes at direction, one of them resolving at
 * refinement, and a locked grid at delivery. The diagrams are the content —
 * the words are a label and one line, and the section is understandable with
 * the animation switched off because the diagrams are static SVG either way.
 */

interface Stage {
  number: string;
  title: string;
  line: string;
}

const STAGES: Stage[] = [
  { number: "01", title: "Discovery", line: "What exists, and what is in the way." },
  { number: "02", title: "Research", line: "References, competitors, constraints." },
  { number: "03", title: "Direction", line: "Two routes, honestly different." },
  { number: "04", title: "Refinement", line: "One route, taken to the edges." },
  { number: "05", title: "Delivery", line: "Files, rules, and someone to ask." },
];

/** Deterministic, so server and client draw the same diagram. */
const noise = (n: number) => {
  const value = Math.sin(n * 91.7) * 34719.317;
  return value - Math.floor(value);
};

/**
 * One set of twenty marks, five arrangements. The same marks move between
 * stages, which is what makes it read as a process rather than five pictures.
 */
function StageDiagram({ stage }: { stage: number }) {
  const marks = Array.from({ length: 20 }, (_, i) => {
    const a = noise(i + 1);
    const b = noise(i * 3.1 + 7);
    const column = i % 4;
    const row = Math.floor(i / 4);

    switch (stage) {
      case 0: // Scattered.
        return { x: 6 + a * 88, y: 6 + b * 88, w: 3 + b * 4, h: 3 + a * 4, o: 0.35 + a * 0.4 };
      case 1: // Sorted into bands.
        return { x: 8 + a * 84, y: 14 + row * 18, w: 4 + b * 6, h: 4, o: 0.4 + b * 0.35 };
      case 2: // Two routes.
        return {
          x: (i % 2 === 0 ? 14 : 56) + (a * 28),
          y: 12 + row * 18,
          w: 6 + b * 4,
          h: 4,
          o: i % 2 === 0 ? 0.75 : 0.3,
        };
      case 3: // One route, resolving.
        return {
          x: 16 + column * 8 + a * 6,
          y: 12 + row * 18,
          w: 10 + b * 6,
          h: 4,
          o: 0.8,
        };
      default: // Locked.
        return { x: 14 + column * 19, y: 14 + row * 19, w: 15, h: 15, o: 0.9 };
    }
  });

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      {marks.map((mark, index) => (
        <rect
          key={index}
          x={mark.x}
          y={mark.y}
          width={mark.w}
          height={mark.h}
          className="fill-foreground"
          opacity={mark.o}
          style={{
            transition:
              "x 600ms cubic-bezier(0.4,0,0.2,1), y 600ms cubic-bezier(0.4,0,0.2,1), width 600ms ease, height 600ms ease, opacity 600ms ease",
          }}
        />
      ))}
    </svg>
  );
}

export function ProcessSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const triggers = STAGES.map((_, index) =>
      ScrollTrigger.create({
        trigger: section.querySelector(`[data-stage="${index}"]`) as Element,
        start: "top 65%",
        end: "bottom 45%",
        onEnter: () => setActive(index),
        onEnterBack: () => setActive(index),
      })
    );

    return () => triggers.forEach((trigger) => trigger.kill());
  }, [prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="process"
      className="px-6 md:px-12 max-w-[1700px] mx-auto py-20 md:py-28 border-t border-border-custom"
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-14 md:mb-20">
        How it runs
      </h2>

      <div className="grid grid-cols-12 gap-x-8 gap-y-10">
        {/* The diagram holds still while the stages scroll past it. */}
        <div className="hidden md:block md:col-span-5">
          <div className="sticky top-32 aspect-square max-w-[380px] border border-border-custom p-6">
            <StageDiagram stage={prefersReducedMotion ? 4 : active} />
          </div>
        </div>

        <ol className="col-span-12 md:col-span-6 md:col-start-7">
          {STAGES.map((stage, index) => (
            <li
              key={stage.number}
              data-stage={index}
              className="border-t border-border-custom py-7 md:py-9"
            >
              <div className="flex items-baseline gap-5">
                <span className="font-mono text-[0.7rem] tracking-[0.16em] text-foreground-secondary">
                  {stage.number}
                </span>
                <h3
                  className={`font-display font-normal text-2xl md:text-4xl leading-none transition-colors duration-[400ms] ${
                    !prefersReducedMotion && active === index
                      ? "text-foreground"
                      : "text-foreground-secondary"
                  }`}
                >
                  {stage.title}
                </h3>
              </div>
              <p className="mt-3 pl-10 text-sm text-foreground-secondary">{stage.line}</p>

              {/* On phones each stage carries its own diagram; there is no
                  room for a sticky column beside it. */}
              <div className="md:hidden mt-5 pl-10 h-28 w-28">
                <StageDiagram stage={index} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
