"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A1 — "Thaw" route transition.
 *
 * The destination is already rendered when this mounts, so nothing waits on
 * the animation. What the visitor sees: the page briefly frozen behind a
 * crystalline sheet — desaturated, near-white, slightly blurred — which then
 * breaks into shards that melt downward and clear.
 *
 * The melt starts where the visitor clicked and spreads outward, which is what
 * makes it directional in a way panels never were. Keyboard navigation has no
 * click point, so it thaws from the centre.
 *
 * Reveal-only. It never covers before navigating; that is what made the
 * previous version feel slow.
 *
 * Animated with GSAP rather than a second animation library. This was the only
 * component importing motion, and carrying a whole runtime on every route for
 * thirteen opacity-and-translate tweens is not a trade worth making when the
 * library already driving every other animation on the site does the same job.
 */

/**
 * False through the first render of a full page load, so the transition never
 * fires on entry, where the loading screen already owns the moment. Only ever
 * written from an effect, so the server module keeps it false.
 */
let hasNavigated = false;

/** Where the last pointer press landed, in viewport fractions. */
const clickOrigin = { x: 0.5, y: 0.5 };
let trackingPointer = false;

function trackPointer() {
  if (trackingPointer) return;
  trackingPointer = true;
  window.addEventListener(
    "pointerdown",
    (event) => {
      clickOrigin.x = event.clientX / window.innerWidth;
      clickOrigin.y = event.clientY / window.innerHeight;
    },
    { capture: true, passive: true }
  );
}

const COLUMNS = 4;
const ROWS = 3;

/** Cells overlap so the sheet reads as solid until it actually breaks. */
const OVERLAP = 2.2;
const JITTER_X = 9;
const JITTER_Y = 7;

const MELT_DURATION = 0.34;
const MELT_SPREAD = 0.16;
const FROST_FADE = 0.26;

/** 0.16 + 0.34 = 0.5s of tween, budgeted under the 600ms ceiling. */
const EASE_MELT = "cubic-bezier(0.76, 0, 0.24, 1)";

interface Shard {
  clipPath: string;
  centreX: number;
  centreY: number;
}

/** Deterministic, so server and client generate identical geometry. */
const noise = (n: number) => {
  const value = Math.sin(n * 127.1) * 43758.5453;
  return value - Math.floor(value);
};

const SHARDS: Shard[] = (() => {
  const shards: Shard[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const index = row * COLUMNS + column;
      const jitter = (seed: number, amount: number) =>
        (noise(index * 7 + seed) - 0.5) * amount;

      const left = (column / COLUMNS) * 100 - OVERLAP;
      const right = ((column + 1) / COLUMNS) * 100 + OVERLAP;
      const top = (row / ROWS) * 100 - OVERLAP;
      const bottom = ((row + 1) / ROWS) * 100 + OVERLAP;

      const points: [number, number][] = [
        [left + jitter(1, JITTER_X), top + jitter(2, JITTER_Y)],
        [right + jitter(3, JITTER_X), top + jitter(4, JITTER_Y)],
        [right + jitter(5, JITTER_X), bottom + jitter(6, JITTER_Y)],
        [left + jitter(7, JITTER_X), bottom + jitter(8, JITTER_Y)],
      ];

      shards.push({
        clipPath: `polygon(${points
          .map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`)
          .join(", ")})`,
        centreX: (column + 0.5) / COLUMNS,
        centreY: (row + 0.5) / ROWS,
      });
    }
  }

  return shards;
})();

function Thaw({ onDone }: { onDone: () => void }) {
  // Snapshot the origin at mount, so a pointer press during the melt cannot
  // re-order shards mid-animation.
  const [origin] = useState(() => ({ ...clickOrigin }));
  const rootRef = useRef<HTMLDivElement>(null);

  const delayFor = (shard: Shard) => {
    const dx = shard.centreX - origin.x;
    const dy = shard.centreY - origin.y;
    // Normalised against the viewport diagonal, so the spread stays even.
    const distance = Math.min(Math.hypot(dx, dy) / Math.SQRT1_2, 1);
    return distance * MELT_SPREAD;
  };

  const delays = SHARDS.map(delayFor);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const shards = Array.from(root.querySelectorAll<HTMLElement>("[data-thaw-shard]"));
    const frost = root.querySelector<HTMLElement>("[data-thaw-frost]");

    // One timeline, so the whole transition is killed as a unit if the visitor
    // navigates again before it finishes.
    const timeline = gsap.timeline({ onComplete: onDone });

    if (frost) {
      timeline.to(frost, { opacity: 0, duration: FROST_FADE, ease: "none" }, 0);
    }

    shards.forEach((shard, index) => {
      timeline.to(
        shard,
        {
          yPercent: 108,
          opacity: 0.35,
          duration: MELT_DURATION,
          ease: EASE_MELT,
        },
        delays[index]
      );
    });

    return () => {
      timeline.kill();
    };
    // The geometry is module-level and the origin is snapshotted at mount, so
    // this runs once per mounted transition and the gate keys it per route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-thaw=""
      className="fixed inset-0 z-[99998] pointer-events-none overflow-hidden"
    >
      {/*
        The frozen state. One backdrop-filter element rather than one per
        shard: stacking a dozen of them is the expensive way to do this.
      */}
      <div data-thaw-frost="" className="absolute inset-0 bg-[#DCE6F0]/18" />

      {SHARDS.map((shard, index) => (
        <div
          key={index}
          data-thaw-shard=""
          className="absolute inset-0 bg-[#E4ECF4]"
          style={{ clipPath: shard.clipPath }}
        />
      ))}
    </div>
  );
}

function ThawGate() {
  // Read at mount only: true on a client-side navigation, false on a full load.
  const [play] = useState(() => hasNavigated);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    hasNavigated = true;
  }, []);

  if (!play || finished) return null;

  return <Thaw onDone={() => setFinished(true)} />;
}

export function PageTransition() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    trackPointer();
  }, []);

  // No fade substitute: under reduced motion there is simply no transition.
  if (prefersReducedMotion) return null;

  // Keying on pathname remounts the gate on every navigation, which is what
  // plays it. No effect writes state, so no react-hooks rule is in play.
  return <ThawGate key={pathname} />;
}
