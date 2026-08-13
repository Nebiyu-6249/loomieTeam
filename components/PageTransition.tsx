"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The route transition, reduced to what a route transition is for.
 *
 * What was here: a pale crystalline sheet broken into twelve jittered polygons
 * that melted downward from wherever the visitor clicked. It was the most
 * elaborate animation on the site and the weakest — a near-white overlay
 * flashing across a near-black page reads as a fault, the shards belonged to no
 * other part of the design, and the whole thing announced itself between two
 * pages that were already quieter than it was.
 *
 * What is here now: the page leaves, and the next one arrives. Content lifts
 * six pixels and fades on the way out, settles from eight on the way in, and
 * nothing is drawn on top of anything. No overlay means no flash, and the
 * transition costs one opacity and one transform on a single element.
 *
 * The exit is deliberately shorter than the entrance. Leaving should feel like
 * a decision already taken; arriving is the part worth watching.
 */

const EXIT = 0.2;
const ENTER = 0.38;

/**
 * The element everything animates.
 *
 * Not <main>, which is replaced wholesale on navigation — animating it would
 * mean animating a node that is about to be unmounted. The layout wrapper
 * survives the route change, so it is the thing that can carry both halves.
 */
const SHELL = "[data-route-shell]";

export function PageTransition() {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  /** False on the first render of a full load: the loader owns that moment. */
  const navigated = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const shell = document.querySelector<HTMLElement>(SHELL);
    if (!shell) return;

    if (!navigated.current) {
      navigated.current = true;
      return;
    }

    const tween = gsap.fromTo(
      shell,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: ENTER, ease: "power3.out", clearProps: "opacity,transform" }
    );

    return () => {
      tween.kill();
    };
  }, [pathname, prefersReducedMotion]);

  /**
   * The exit half.
   *
   * Next has no "about to navigate" hook, so this listens for a click on an
   * internal link and plays the outgoing tween while the router works. The
   * navigation is never waited on: if the route resolves first the entrance
   * simply overrides this, which is the correct outcome and the reason the
   * previous version felt slow — it covered the screen before navigating.
   */
  useEffect(() => {
    if (prefersReducedMotion) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.("a");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/")) return;

      const destination = new URL(href, window.location.origin);
      if (destination.pathname === window.location.pathname) return;

      const shell = document.querySelector<HTMLElement>(SHELL);
      if (!shell) return;

      gsap.to(shell, { opacity: 0, y: -6, duration: EXIT, ease: "power2.in" });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [prefersReducedMotion]);

  return null;
}
