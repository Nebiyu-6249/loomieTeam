"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The thesis, made literal: the page changes temperature as you scroll.
 *
 * Snow at the top, river at the bottom. Background interpolates from a cold
 * blue-black to a warm charcoal, and --accent-strength climbs 0 to 1 so the
 * gold is absent at the hero and fully present by the footer. Grain density
 * rises with it.
 *
 * The shift is deliberately below the threshold of notice. Compare a
 * screenshot of the top and the bottom and it is obvious; scroll through it
 * and it should not register as a colour change.
 *
 * One rAF-throttled write per frame, never one per scroll event.
 */

/**
 * Cold to warm, per theme. These live here rather than in globals.css because
 * they are interpolation endpoints, not tokens anything else should read.
 */
const RAMPS = {
  dark: {
    background: ["#04060A", "#0A0806"],
    surface: ["#080B11", "#12100C"],
    surfaceCard: ["#0E121A", "#1A1712"],
  },
  light: {
    background: ["#F2F5F9", "#F9F6F1"],
    surface: ["#FFFFFF", "#FFFDFA"],
    surfaceCard: ["#E7EBF1", "#EFEAE1"],
  },
} as const;

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mix = (from: Rgb, to: Rgb, t: number) =>
  `rgb(${Math.round(from[0] + (to[0] - from[0]) * t)} ${Math.round(
    from[1] + (to[1] - from[1]) * t
  )} ${Math.round(from[2] + (to[2] - from[2]) * t)})`;

const RAMP_KEYS = ["background", "surface", "surfaceCard"] as const;

const CSS_VARIABLE: Record<(typeof RAMP_KEYS)[number], string> = {
  background: "--background",
  surface: "--surface",
  surfaceCard: "--surface-card",
};

const write = (progress: number) => {
  const root = document.documentElement;
  const ramp = RAMPS[root.classList.contains("dark") ? "dark" : "light"];

  for (const key of RAMP_KEYS) {
    root.style.setProperty(
      CSS_VARIABLE[key],
      mix(hexToRgb(ramp[key][0]), hexToRgb(ramp[key][1]), progress)
    );
  }

  root.style.setProperty("--accent-strength", progress.toFixed(3));
  // Grain thickens toward the river end, barely.
  root.style.setProperty(
    "--grain-opacity",
    (0.022 + progress * 0.026).toFixed(4)
  );
};

const clearWrites = () => {
  const root = document.documentElement;
  for (const key of RAMP_KEYS) root.style.removeProperty(CSS_VARIABLE[key]);
  root.style.removeProperty("--accent-strength");
  root.style.removeProperty("--grain-opacity");
};

export function ScrollTemperature() {
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion still gets the thesis, just not the travel: settle at the
    // midpoint so neither end of the story is misrepresented.
    if (prefersReducedMotion) {
      write(0.5);
      const observer = new MutationObserver(() => write(0.5));
      observer.observe(root, { attributes: true, attributeFilter: ["class"] });
      return () => {
        observer.disconnect();
        clearWrites();
      };
    }

    let frame = 0;
    let queued = false;
    let lastProgress = -1;

    const read = () => {
      queued = false;

      const scrollable = root.scrollHeight - window.innerHeight;
      const progress =
        scrollable <= 0
          ? 0
          : Math.min(Math.max(window.scrollY / scrollable, 0), 1);

      // Skip sub-perceptual writes; this runs on every frame of every scroll.
      if (Math.abs(progress - lastProgress) < 0.001) return;

      lastProgress = progress;
      write(progress);
    };

    const schedule = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };

    read();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    // The theme toggle swaps which ramp applies, so recompute on class change.
    const observer = new MutationObserver(() => {
      lastProgress = -1;
      schedule();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      clearWrites();
    };
  }, [prefersReducedMotion]);

  return null;
}
