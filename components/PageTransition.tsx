"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { BlurText } from "./BlurText";

/**
 * Reveal-only route transition.
 *
 * The previous version covered the screen before navigating, which added real
 * latency to every click. This one only ever uncovers: by the time it mounts
 * the destination is already rendered underneath, so the panels lift off a
 * finished page and nothing waits on the animation.
 */

/**
 * False through the first render of a full page load, so the transition never
 * fires on entry, where the loading screen already owns the moment. Only ever
 * written from an effect, so the server module keeps it false and SSR matches
 * the client's first render.
 */
let hasNavigated = false;

const PANEL_COUNT = 5;
/**
 * 0.32 + 4 x 0.06 = 0.56s of tween, budgeted under the 650ms ceiling rather
 * than filling it, because the observed occlusion always runs longer than the
 * configured total: the mount frame, rAF granularity and the unmount render.
 *
 * Measured in Chromium against a production build, the overlay's real lifetime
 * is 570-596ms on any navigation after the first, and about 653ms on the very
 * first one of a session. That first-run excess is Motion initialising, not
 * this tween: navigation itself costs 11-19ms, and cutting the duration by
 * 20ms moved the measurement by 3ms.
 */
const PANEL_DURATION = 0.32;
const PANEL_STAGGER = 0.06;
const SWEEP_TOTAL_MS = (PANEL_DURATION + (PANEL_COUNT - 1) * PANEL_STAGGER) * 1000;

/** GSAP power4.inOut as a cubic bezier, for parity with the rest of the site. */
const EASE_POWER4_IN_OUT = [0.86, 0, 0.07, 1] as const;
/**
 * The letter effect is scaled down here. Task 8.3's 0.8s duration cannot both
 * arrive and leave inside a 0.64s sweep, and the ceiling is the harder
 * constraint, so the label runs fast and is gone well before the panels.
 */
const LABEL_STAGGER = 0.02;
const LABEL_DURATION = 0.2;
const LABEL_EXIT_DELAY = 0.26;
const LABEL_EXIT_DURATION = 0.1;

const ROUTE_NAMES: Record<string, string> = {
  "/": "Loomie",
  "/work": "Work",
  "/services": "Services",
  "/studio": "Studio",
  "/clients": "Clients",
  "/contact": "Contact",
};

function routeName(pathname: string) {
  if (ROUTE_NAMES[pathname]) return ROUTE_NAMES[pathname];
  if (pathname.startsWith("/work/")) return "Case Study";
  return "Loomie";
}

function Sweep({ pathname }: { pathname: string }) {
  // Read at mount only. This component is keyed on pathname, so it remounts on
  // every navigation and reads true from the second route onward.
  const [play] = useState(() => hasNavigated);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    hasNavigated = true;
  }, []);

  if (!play || finished) return null;

  const name = routeName(pathname);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[99998] pointer-events-none overflow-hidden"
    >
      {/* Panels: covering at mount, sweeping up and off left to right. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: PANEL_COUNT }, (_, index) => (
          <motion.div
            key={index}
            className="h-full flex-1 bg-foreground"
            initial={{ y: 0 }}
            animate={{ y: "-100%" }}
            transition={{
              duration: PANEL_DURATION,
              delay: index * PANEL_STAGGER,
              ease: EASE_POWER4_IN_OUT,
            }}
            onAnimationComplete={
              index === PANEL_COUNT - 1 ? () => setFinished(true) : undefined
            }
          />
        ))}
      </div>

      {/* Route name, gone before the panels are. */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{
          delay: LABEL_EXIT_DELAY,
          duration: LABEL_EXIT_DURATION,
          ease: "linear",
        }}
      >
        <BlurText
          text={name}
          trigger="mount"
          duration={LABEL_DURATION}
          stagger={LABEL_STAGGER}
          className="text-background text-4xl md:text-6xl font-black tracking-tighter uppercase"
        />
      </motion.div>
    </div>
  );
}

export function PageTransition() {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  // No fade substitute: under reduced motion there is simply no transition.
  if (prefersReducedMotion) return null;

  // Keying on pathname remounts Sweep on every navigation, which is what plays
  // it. No effect writes state, so none of the react-hooks rules are in play.
  return <Sweep key={pathname} pathname={pathname} />;
}

export const PAGE_TRANSITION_TOTAL_MS = SWEEP_TOTAL_MS;
