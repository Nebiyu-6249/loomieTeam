"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

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
 * 0.34 + 4 x 0.06 = 0.58s of tween. Measured end to end in Chromium, the
 * observed occlusion runs about 40ms longer than the configured total because
 * of the mount frame, rAF granularity and the unmount render. Budgeting for
 * that is what keeps the real number under the 650ms ceiling rather than just
 * the number in this file.
 */
const PANEL_DURATION = 0.34;
const PANEL_STAGGER = 0.06;
const SWEEP_TOTAL_MS = (PANEL_DURATION + (PANEL_COUNT - 1) * PANEL_STAGGER) * 1000;

/** GSAP power4.inOut as a cubic bezier, for parity with the rest of the site. */
const EASE_POWER4_IN_OUT = [0.86, 0, 0.07, 1] as const;
/** GSAP power3.out. */
const EASE_POWER3_OUT = [0.165, 0.84, 0.44, 1] as const;

/**
 * The letter effect is scaled down here. Task 8.3's 0.8s duration cannot both
 * arrive and leave inside a 0.64s sweep, and the ceiling is the harder
 * constraint, so the label runs fast and is gone well before the panels.
 */
const LABEL_STAGGER = 0.02;
const LABEL_DURATION = 0.2;
const LABEL_EXIT_DELAY = 0.28;
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
        <span className="text-background text-4xl md:text-6xl font-black tracking-tighter uppercase">
          {name.split("").map((character, index) => (
            <motion.span
              key={index}
              className="inline-block"
              initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: LABEL_DURATION,
                delay: index * LABEL_STAGGER,
                ease: EASE_POWER3_OUT,
              }}
            >
              {character === " " ? " " : character}
            </motion.span>
          ))}
        </span>
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
