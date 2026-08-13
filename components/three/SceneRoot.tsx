"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { getCapabilities } from "./capabilities";
import { SceneFallback } from "./SceneFallback";

/**
 * Decides whether there is a canvas at all, and keeps three.js out of the
 * bundle of every page that has nothing to draw.
 *
 * No canvas under reduced motion, and none without WebGL. In both cases the
 * static composition renders instead and the site carries on working.
 *
 * ── Route gating ─────────────────────────────────────────────────────────
 * This component lives in the root layout because the canvas has to be a
 * direct child of body: it is a fixed layer at -z-10, and moving it inside a
 * page's <main> puts it in the wrong place in the painting order. But only the
 * homepage has a section that draws into it, and rendering it everywhere meant
 * every route downloaded three.js — measured at 230KB gzipped, on /contact,
 * where nothing has ever been drawn.
 *
 * next/dynamic only fetches the chunk when the component actually renders, so
 * gating the render on the route gates the download too. The layout position
 * is untouched.
 *
 * Elsewhere it renders nothing rather than the fallback. The fallback is a
 * still field across the whole viewport, which is the right stand-in for a
 * canvas that is about to appear in the same place and precisely the wrong
 * thing behind the work archive — a permanent starfield behind every page is
 * what this rebuild took out.
 */

const Scene = dynamic(() => import("./Scene"), {
  // WebGL cannot be server rendered.
  ssr: false,
  loading: () => <SceneFallback />,
});

/** The routes with a SceneAnchor on them. Currently one. */
const SCENE_ROUTES = new Set(["/"]);

/** Detection touches the DOM, so the server has to assume no canvas. */
const subscribe = () => () => {};
const getWebgl = () => getCapabilities().webgl;
const getWebglServer = () => false;

export function SceneRoot() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const webgl = useSyncExternalStore(subscribe, getWebgl, getWebglServer);

  if (!SCENE_ROUTES.has(pathname)) return null;

  // No canvas under reduced motion, and none without WebGL. The static
  // composition renders instead and the site carries on working.
  if (prefersReducedMotion || !webgl) {
    return <SceneFallback />;
  }

  return <Scene />;
}
