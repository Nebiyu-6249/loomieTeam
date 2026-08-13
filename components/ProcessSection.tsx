"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Five stages, drawn as the artefact each one actually produces.
 *
 * The first version of this section was five text columns. The second replaced
 * them with twenty rectangles that rearranged themselves, which was better —
 * something narrowing is the right shape for this — but twenty rectangles are
 * an abstraction of a process, not a picture of one. A visitor could see that
 * order was increasing without ever seeing what the studio hands over.
 *
 * So the marks now settle into things a design studio recognises: a wall of
 * unsorted material, a contact sheet, two routes drawn as two different page
 * layouts, one of them taken further with its guides showing, and a delivered
 * system on a registered sheet. The furniture around them — frames, column
 * guides, a dimension line, the corner marks — is what makes each one read as
 * an artefact rather than a chart, and the registration marks at the end are
 * the same ones on the brand sheets in the imagery, so the last stage points
 * at something the site actually shows.
 *
 * The same twenty marks move between all five. That continuity is the whole
 * argument: nothing new arrives late in a project, it is the same material
 * getting sorted. The diagrams are static SVG either way, so the section is
 * understandable with the animation switched off.
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

interface Mark {
  x: number;
  y: number;
  w: number;
  h: number;
  o: number;
}

/** A page layout in a 0..1 box: title, subtitle, image, two columns, action. */
const ROUTE_A: Mark[] = [
  { x: 0.08, y: 0.08, w: 0.72, h: 0.07, o: 0.9 },
  { x: 0.08, y: 0.2, w: 0.44, h: 0.05, o: 0.6 },
  { x: 0.08, y: 0.32, w: 0.84, h: 0.26, o: 0.85 },
  { x: 0.08, y: 0.64, w: 0.38, h: 0.035, o: 0.4 },
  { x: 0.08, y: 0.71, w: 0.38, h: 0.035, o: 0.4 },
  { x: 0.08, y: 0.78, w: 0.24, h: 0.035, o: 0.4 },
  { x: 0.54, y: 0.64, w: 0.38, h: 0.035, o: 0.4 },
  { x: 0.54, y: 0.71, w: 0.38, h: 0.035, o: 0.4 },
  { x: 0.54, y: 0.78, w: 0.3, h: 0.035, o: 0.4 },
  { x: 0.08, y: 0.89, w: 0.2, h: 0.045, o: 0.75 },
];

/** The other route: image first, type small and centred. Honestly different. */
const ROUTE_B: Mark[] = [
  { x: 0.08, y: 0.08, w: 0.84, h: 0.34, o: 0.85 },
  { x: 0.26, y: 0.48, w: 0.48, h: 0.05, o: 0.9 },
  { x: 0.34, y: 0.57, w: 0.32, h: 0.035, o: 0.55 },
  { x: 0.08, y: 0.68, w: 0.24, h: 0.16, o: 0.5 },
  { x: 0.38, y: 0.68, w: 0.24, h: 0.16, o: 0.5 },
  { x: 0.68, y: 0.68, w: 0.24, h: 0.16, o: 0.5 },
  { x: 0.08, y: 0.88, w: 0.16, h: 0.03, o: 0.35 },
  { x: 0.38, y: 0.88, w: 0.16, h: 0.03, o: 0.35 },
  { x: 0.68, y: 0.88, w: 0.16, h: 0.03, o: 0.35 },
  { x: 0.42, y: 0.0, w: 0.16, h: 0.03, o: 0.3 },
];

/**
 * The chosen route with the detail refinement adds: the same page, plus the
 * spacing ladder and the small type that only exist once a route is settled.
 */
const REFINED: Mark[] = [
  ...ROUTE_A.map((mark) => ({ ...mark, o: Math.min(1, mark.o + 0.1) })),
  { x: 0.08, y: 0.6, w: 0.06, h: 0.012, o: 0.5 },
  { x: 0.18, y: 0.6, w: 0.06, h: 0.012, o: 0.5 },
  { x: 0.28, y: 0.6, w: 0.06, h: 0.012, o: 0.5 },
  { x: 0.54, y: 0.6, w: 0.06, h: 0.012, o: 0.5 },
  { x: 0.64, y: 0.6, w: 0.06, h: 0.012, o: 0.5 },
  { x: 0.86, y: 0.64, w: 0.06, h: 0.012, o: 0.35 },
  { x: 0.86, y: 0.71, w: 0.06, h: 0.012, o: 0.35 },
  { x: 0.86, y: 0.78, w: 0.06, h: 0.012, o: 0.35 },
  { x: 0.34, y: 0.89, w: 0.14, h: 0.03, o: 0.4 },
  { x: 0.54, y: 0.89, w: 0.14, h: 0.03, o: 0.4 },
];

/** Maps a 0..1 layout into a box on the 100-unit canvas. */
const place = (mark: Mark, ox: number, oy: number, w: number, h: number): Mark => ({
  x: ox + mark.x * w,
  y: oy + mark.y * h,
  w: Math.max(0.6, mark.w * w),
  h: Math.max(0.6, mark.h * h),
  o: mark.o,
});

function arrange(stage: number, index: number): Mark {
  const a = noise(index + 1);
  const b = noise(index * 3.1 + 7);
  const column = index % 4;
  const row = Math.floor(index / 4);

  switch (stage) {
    // Raw material, still on the wall.
    case 0:
      return {
        x: 8 + a * 74,
        y: 10 + b * 72,
        w: 6 + b * 11,
        h: 4 + a * 8,
        o: 0.28 + a * 0.36,
      };

    // A contact sheet: everything the same size, in rows, so it can be compared.
    case 1:
      return { x: 15 + column * 19, y: 20 + row * 14, w: 13, h: 8, o: 0.3 + b * 0.5 };

    // Two routes, as two page layouts side by side.
    case 2:
      return index < 10
        ? place(ROUTE_A[index], 10, 16, 36, 68)
        : place(ROUTE_B[index - 10], 54, 16, 36, 68);

    // One route, at full size, with the detail refinement adds.
    case 3:
      return place(REFINED[index], 20, 12, 60, 76);

    // The delivered system: one measure, evenly repeated.
    default:
      return {
        x: 11 + (index % 5) * 16,
        y: 18 + Math.floor(index / 5) * 16,
        w: 14,
        h: 14,
        o: 0.9,
      };
  }
}

/**
 * The frames, guides and marks around the marks.
 *
 * This is the part that makes a stage look like a thing off a studio wall
 * rather than a data visualisation, and it is why each stage is recognisable
 * as its own artefact at a glance.
 */
function Furniture({ stage }: { stage: number }) {
  const guide = "stroke-foreground/25";
  const faint = "stroke-foreground/15";

  switch (stage) {
    // Nothing is framed yet. That is the point of the stage.
    case 0:
      return null;

    case 1:
      return (
        <g fill="none" strokeWidth="0.7">
          <rect x="12" y="16" width="76" height="72" className={guide} />
          {[30, 44, 58, 72].map((y) => (
            <path key={y} d={`M12 ${y}H88`} className={faint} />
          ))}
        </g>
      );

    case 2:
      return (
        <g fill="none" strokeWidth="0.7">
          <rect x="10" y="16" width="36" height="68" className={guide} />
          <rect x="54" y="16" width="36" height="68" className={faint} strokeDasharray="2 2" />
          <path d="M50 42v16" className={faint} />
        </g>
      );

    case 3:
      return (
        <g fill="none" strokeWidth="0.7">
          <rect x="20" y="12" width="60" height="76" className={guide} />
          {[35, 50, 65].map((x) => (
            <path key={x} d={`M${x} 12V88`} className={faint} strokeDasharray="2 3" />
          ))}
          {/* One measure called out, the way a spec sheet calls one out. */}
          <path d="M20 94H80M20 91v6M80 91v6" className={guide} />
        </g>
      );

    // The same corner marks the brand sheets in the imagery carry.
    default:
      return (
        <g fill="none" strokeWidth="0.8">
          <path
            d="M4 4h6M4 4v6M96 4h-6M96 4v6M4 96h6M4 96v-6M96 96h-6M96 96v-6"
            className={guide}
          />
        </g>
      );
  }
}

function StageDiagram({ stage }: { stage: number }) {
  const marks = Array.from({ length: 20 }, (_, index) => arrange(stage, index));

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
      <Furniture stage={stage} />
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
      className="px-6 md:px-12 max-w-[1700px] mx-auto py-16 md:py-22 border-t border-border-custom"
    >
      <h2 className="font-mono text-xs uppercase tracking-[0.22em] text-foreground-secondary mb-10 md:mb-14">
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
              <div className="md:hidden mt-5 pl-10 h-32 w-32">
                <StageDiagram stage={index} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
