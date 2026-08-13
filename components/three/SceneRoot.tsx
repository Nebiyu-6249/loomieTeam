"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { getCapabilities } from "./capabilities";
import { SceneFallback } from "./SceneFallback";

/**
 * Decides whether there is a canvas at all, and when to go and fetch one.
 *
 * Three gates, in order of how much they save.
 *
 * ── Route ────────────────────────────────────────────────────────────────
 * This component lives in the root layout because the canvas has to be a
 * direct child of body: it is a fixed layer at -z-10, and moving it inside a
 * page's <main> puts it in the wrong place in the painting order. But only the
 * homepage has a section that draws into it, and rendering it everywhere meant
 * every route downloading three.js — measured at 230KB gzipped, on /contact,
 * where nothing has ever been drawn.
 *
 * ── Proximity ────────────────────────────────────────────────────────────
 * Even on the homepage the canvas has nothing to do until the visitor reaches
 * Snow → River → Light, which is several screens down. Loading it at mount put
 * three.js in the critical path of a page whose first screen is a headline and
 * a photograph. It is now fetched when the section is within a thousand pixels
 * of the viewport — far enough ahead that the chunk has arrived and compiled
 * before there is anything to see, so no loading state is ever visible.
 *
 * ── Capability ───────────────────────────────────────────────────────────
 * No canvas under reduced motion, and none without WebGL. The static
 * composition renders instead and the site carries on working.
 *
 * Nothing renders at all until the section is close. The fallback is a still
 * field across the whole viewport, which is the right stand-in for a canvas
 * about to appear in the same place and exactly the wrong thing to flash over
 * the hero on the way past.
 */

const Scene = dynamic(() => import("./Scene"), {
  // WebGL cannot be server rendered. No loading element either: the proximity
  // gate exists so that there is never a gap to fill.
  ssr: false,
  loading: () => null,
});

/** The routes with a SceneAnchor on them. Currently one. */
const SCENE_ROUTES = new Set(["/"]);

/** How far ahead of the section the chunk starts downloading. */
const LOOKAHEAD = "1000px";

/** Detection touches the DOM, so the server has to assume no canvas. */
const subscribe = () => () => {};
const getWebgl = () => getCapabilities().webgl;
const getWebglServer = () => false;

/**
 * True once the section that draws into the canvas is within reach.
 *
 * Watches the section itself rather than a scroll position, so it stays correct
 * when the sections above it change height — which they did, repeatedly.
 */
function useSceneApproaching(enabled: boolean) {
  const [approaching, setApproaching] = useState(false);

  useEffect(() => {
    if (!enabled || approaching) return;

    const target = document.querySelector("[data-state-section]");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setApproaching(true);
        observer.disconnect();
      },
      { rootMargin: `${LOOKAHEAD} 0px` }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, approaching]);

  return approaching;
}

export function SceneRoot() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const webgl = useSyncExternalStore(subscribe, getWebgl, getWebglServer);

  const onSceneRoute = SCENE_ROUTES.has(pathname);
  const approaching = useSceneApproaching(onSceneRoute && !prefersReducedMotion && webgl);

  if (!onSceneRoute || !approaching) return null;

  if (prefersReducedMotion || !webgl) {
    return <SceneFallback />;
  }

  return <Scene />;
}
