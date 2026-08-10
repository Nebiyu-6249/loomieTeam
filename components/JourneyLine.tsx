"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A single line that draws itself as the visitor scrolls, connecting the
 * section group it wraps. On brand: the river.
 *
 * One sticky viewport-height svg rather than one page-long path. A path that
 * tall breaks on every resize and content reflow, and it cannot be kept in
 * register with sections whose heights are not known up front.
 *
 * It never captures scroll: no pin, and pointer-events none throughout. It is
 * connective tissue, not a feature.
 */

/** Gentle meander, defined in viewBox units and stretched by the container. */
const RIVER_PATH =
  "M 54 0 C 30 13, 76 29, 46 45 C 18 60, 72 73, 50 100";

export function JourneyLine({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const path = pathRef.current;
        const container = containerRef.current;
        if (!path || !container) return;

        const seed = () => {
          const length = path.getTotalLength();
          gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length,
          });
          return length;
        };

        let length = seed();

        const tween = gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        // Re-seeded on resize, so a reflow cannot leave the dash pattern
        // describing a path length that no longer exists.
        const observer = new ResizeObserver(() => {
          const next = path.getTotalLength();
          if (Math.abs(next - length) < 0.5) return;
          length = next;
          gsap.set(path, { strokeDasharray: next });
          ScrollTrigger.refresh();
        });
        observer.observe(container);

        return () => {
          observer.disconnect();
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });
    }, containerRef);

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={containerRef} className="relative">
      {/*
        Zero-height sticky box so the svg overflows into view without taking
        any space in the flow or pushing the sections it sits behind.
      */}
      <div className="sticky top-0 h-0 z-0 pointer-events-none" aria-hidden="true">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-screen text-foreground-secondary"
          fill="none"
        >
          <path
            ref={pathRef}
            d={RIVER_PATH}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeOpacity={0.25}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
