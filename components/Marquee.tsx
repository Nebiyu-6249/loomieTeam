"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useLenis } from "./LenisScrollProvider";

const MARQUEE_PHRASES = [
  "DESIGN THAT CONNECTS",
  "FROM IDEA TO IDENTITY",
  "CLEAR. CONNECTED. COMPLETE.",
];

/** Degrees of lean at full tilt, and the scroll velocity that reaches it. */
const MAX_SKEW = 9;
const VELOCITY_AT_MAX_SKEW = 45;

export function Marquee() {
  // The skew sits on a wrapper rather than the strip itself: the strip carries
  // a CSS animation on transform, and CSS animations beat inline styles, so a
  // skew written to the same element would be ignored.
  const skewRef = useRef<HTMLDivElement>(null);
  const lenisRef = useLenis();

  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const wrapper = skewRef.current;
      if (!wrapper) return;

      const skewTo = gsap.quickTo(wrapper, "skewX", {
        duration: 0.45,
        ease: "power3",
      });

      const handleScroll = ({ velocity }: { velocity: number }) => {
        skewTo(
          gsap.utils.clamp(
            -MAX_SKEW,
            MAX_SKEW,
            (velocity / VELOCITY_AT_MAX_SKEW) * MAX_SKEW
          )
        );
      };

      // Child effects run before the provider's, so the Lenis instance may not
      // exist yet on the first pass. Retry until it does, then subscribe.
      let frame = 0;
      let detach: (() => void) | undefined;

      const attach = () => {
        const lenis = lenisRef?.current;

        if (!lenis) {
          frame = requestAnimationFrame(attach);
          return;
        }

        lenis.on("scroll", handleScroll);
        detach = () => lenis.off("scroll", handleScroll);
      };

      attach();

      return () => {
        cancelAnimationFrame(frame);
        detach?.();
      };
    });

    return () => mm.revert();
  }, [lenisRef]);

  return (
    <div className="w-full py-7 bg-foreground text-background overflow-hidden select-none my-20 rotate-[-5deg] shadow-2xl relative border-y border-foreground">
      <div ref={skewRef}>
        <div className="animate-marquee-smooth whitespace-nowrap gap-16 items-center font-black text-xl md:text-3xl tracking-wider font-sans uppercase">
          {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, index) => (
            <div key={index} className="flex items-center gap-16 mr-16">
              <span>{phrase}</span>
              <span className="text-xl md:text-2xl text-background font-bold leading-none inline-block">●</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
