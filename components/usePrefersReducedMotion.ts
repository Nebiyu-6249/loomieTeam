"use client";

import { useSyncExternalStore } from "react";

/**
 * Reduced motion as render-time state, for the cases where the fallback is a
 * different tree rather than a skipped tween. Subscribing through
 * useSyncExternalStore keeps it out of an effect, which would trip
 * react-hooks/set-state-in-effect.
 */

const query = () => window.matchMedia("(prefers-reduced-motion: reduce)");

const subscribe = (onChange: () => void) => {
  const media = query();
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getSnapshot = () => query().matches;

/** The server cannot know, so it renders the animatable tree. */
const getServerSnapshot = () => false;

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
