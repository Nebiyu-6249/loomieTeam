"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { LoomieEyes } from "./LoomieEyes";

/**
 * Plays on every hard load and never between routes.
 *
 * The gate is module-level rather than sessionStorage. Module state resets on
 * a hard page load or direct entry, and survives client-side navigation, which
 * is exactly the wanted behaviour. It is only ever set from an effect, so the
 * server module never flips it and SSR always renders the overlay, matching
 * the client's first render on a fresh load.
 */
let hasPlayed = false;

/**
 * The overlay is rendered on the server so there is no flash of page before it
 * appears. The inline script in <head> stamps data-loomie-loaded on
 * documentElement under reduced motion, and CSS hides it before first paint;
 * this component then removes it from the DOM so it cannot trap focus.
 */
export function LoadingScreen() {
  const [present, setPresent] = useState(() => !hasPlayed);
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!present) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hasPlayed = true;
      // Already display:none from the head script, so unmounting on the next
      // frame is invisible.
      const id = requestAnimationFrame(() => setPresent(false));
      return () => cancelAnimationFrame(id);
    }

    const counter = { value: 0 };

    const timeline = gsap.timeline({
      onComplete: () => {
        hasPlayed = true;
        setPresent(false);
      },
    });

    timeline.to(counter, {
      value: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = String(
            Math.round(counter.value)
          ).padStart(2, "0");
        }
      },
    });

    timeline.to(
      overlayRef.current,
      {
        clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
        duration: 0.7,
        ease: "power4.inOut",
      },
      "+=0.15"
    );

    return () => {
      timeline.kill();
    };
  }, [present]);

  if (!present) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      className="loading-screen fixed inset-0 z-[999999] bg-background flex flex-col items-center justify-center gap-12 select-none"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        willChange: "clip-path",
      }}
    >
      <LoomieEyes className="w-40 h-20 md:w-64 md:h-32" />

      <span
        ref={counterRef}
        className="font-mono text-5xl md:text-7xl font-bold tabular-nums tracking-tight text-foreground"
      >
        00
      </span>
    </div>
  );
}
