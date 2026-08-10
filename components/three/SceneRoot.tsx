"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";
import { getCapabilities } from "./capabilities";
import { SceneFallback } from "./SceneFallback";

/**
 * Decides whether there is a canvas at all, and keeps three.js out of the
 * main bundle either way.
 *
 * No canvas under reduced motion, and no canvas without WebGL. In both cases
 * the static composition renders instead and the site carries on working.
 */

const Scene = dynamic(() => import("./Scene"), {
  // WebGL cannot be server rendered.
  ssr: false,
  loading: () => <SceneFallback />,
});

/** Detection touches the DOM, so the server has to assume no canvas. */
const subscribe = () => () => {};
const getWebgl = () => getCapabilities().webgl;
const getWebglServer = () => false;

export function SceneRoot() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const webgl = useSyncExternalStore(subscribe, getWebgl, getWebglServer);

  // No canvas under reduced motion, and none without WebGL. The static
  // composition renders instead and the site carries on working.
  if (prefersReducedMotion || !webgl) {
    return <SceneFallback />;
  }

  return <Scene />;
}
