"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { LoomieEyes } from "./LoomieEyes";
import { markLoaderFinished } from "./loaderSignal";

/**
 * Plays on every hard load and never between routes.
 *
 * The gate is module-level rather than sessionStorage. Module state resets on
 * a hard page load or direct entry, and survives client-side navigation, which
 * is exactly the wanted behaviour. It is only ever set from an effect, so the
 * server module never flips it and SSR always renders the overlay, matching
 * the client's first render on a fresh load.
 *
 * It used to drive the particle field: the loader claimed the WebGL points,
 * assembled them into the mark and handed them to the page at a hundred. That
 * was a good idea that cost too much — it made three.js part of the very first
 * thing every visitor downloaded, on every route, to animate a logo for six
 * tenths of a second. The mark now reveals itself: opacity, a little scale, and
 * the counter. Same shape, same timing, none of the engine.
 */
let hasPlayed = false;

/**
 * Once per session rather than once per page load. Module state resets on a
 * hard reload, which meant the loader replayed every time somebody refreshed;
 * sessionStorage survives that and still clears when the tab closes, so a
 * returning visitor gets straight to the page.
 */
const SESSION_KEY = "loomie-loader-played";

const playedThisSession = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
};

const markPlayed = () => {
  hasPlayed = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode: the module flag still covers this tab's navigations */
  }
};

/**
 * The counter climb, and then the clear. Together under a second.
 *
 * This was 1.6s of counting plus 0.85s of wipe — two and a half seconds of
 * deliberately withholding the page to play an animation. Nobody arrives
 * wanting that twice.
 */
const COUNT_DURATION = 0.62;
const CLEAR_DURATION = 0.34;

export function LoadingScreen() {
  const [present, setPresent] = useState(() => !hasPlayed);
  const overlayRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Every exit path signals, so a waiter can never hang. This covers the
    // client-side navigation case, where the overlay never mounts at all.
    if (!present) {
      markLoaderFinished();
      return;
    }

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      playedThisSession()
    ) {
      markPlayed();
      markLoaderFinished();
      // Already display:none from the head script, so unmounting on the next
      // frame is invisible.
      const id = requestAnimationFrame(() => setPresent(false));
      return () => cancelAnimationFrame(id);
    }

    const state = { count: 0 };

    const timeline = gsap.timeline({
      onComplete: () => {
        markPlayed();
        markLoaderFinished();
        setPresent(false);
      },
    });

    // The mark arrives. A little under its final size and a little transparent,
    // settling as the number climbs — one movement, not a logo animation and a
    // counter running alongside it.
    timeline.fromTo(
      markRef.current,
      { opacity: 0, scale: 0.94 },
      { opacity: 1, scale: 1, duration: COUNT_DURATION, ease: "power3.out" },
      0
    );

    timeline.to(
      state,
      {
        count: 100,
        duration: COUNT_DURATION,
        ease: "power2.inOut",
        onUpdate: () => {
          if (counterRef.current) {
            counterRef.current.textContent = String(
              Math.round(state.count)
            ).padStart(2, "0");
          }
        },
      },
      0
    );

    // The clear, as one wipe off the bottom of the screen.
    timeline.to(
      overlayRef.current,
      {
        clipPath: "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)",
        duration: CLEAR_DURATION,
        ease: "power4.inOut",
      },
      "+=0.12"
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
      className="loading-screen fixed inset-0 z-[999999] bg-background flex items-center justify-center select-none"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        willChange: "clip-path",
      }}
    >
      {/* The only flex child, so it sits on the viewport's exact centre. */}
      <div ref={markRef} style={{ opacity: 0 }}>
        <LoomieEyes className="w-40 h-20 md:w-64 md:h-32" track={false} />
      </div>

      <span
        ref={counterRef}
        className="absolute left-1/2 -translate-x-1/2 top-[calc(50%+5.5rem)] font-mono text-5xl md:text-7xl font-bold tabular-nums tracking-tight text-foreground"
      >
        00
      </span>
    </div>
  );
}
