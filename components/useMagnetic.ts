"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { subscribeToPointerFrame } from "./pointerStore";

/**
 * A6 — magnetic proximity.
 *
 * Buttons, nav links and card corners lean toward the cursor as it approaches.
 * The pull is strongest at the edge nearest the cursor, so elements tilt as
 * well as shift rather than sliding bodily.
 *
 * Reads from the shared pointer store, so this adds no listener and no loop of
 * its own. Disabled entirely below 1024px, where there is no cursor to be
 * magnetic toward, and under reduced motion.
 */

/** Proximity band, measured outward from the element's bounds. */
const RANGE = 80;
/** Hard cap on displacement. */
const MAX_SHIFT = 12;
/** Degrees of lean at full pull. */
const MAX_TILT = 6;

const RETURN_DURATION = 0.4;
const EASE = "power3.out";

/**
 * Eight is the ceiling. Past that the per-frame rect reads stop being free,
 * and a page where everything leans at you is a page where nothing does.
 */
const MAX_ELEMENTS = 8;

let activeCount = 0;

export function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (activeCount >= MAX_ELEMENTS) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `useMagnetic: ${MAX_ELEMENTS} elements are already magnetic. This one is inert. Magnetism reads as deliberate only while it is rare.`
        );
      }
      return;
    }

    activeCount += 1;

    // Perspective on the element itself, so the lean is a real rotation rather
    // than a barely visible flat skew. The parents here have none.
    gsap.set(element, { transformPerspective: 600 });

    const moveX = gsap.quickTo(element, "x", {
      duration: RETURN_DURATION,
      ease: EASE,
    });
    const moveY = gsap.quickTo(element, "y", {
      duration: RETURN_DURATION,
      ease: EASE,
    });
    const tiltX = gsap.quickTo(element, "rotationX", {
      duration: RETURN_DURATION,
      ease: EASE,
    });
    const tiltY = gsap.quickTo(element, "rotationY", {
      duration: RETURN_DURATION,
      ease: EASE,
    });

    // Last target sent to each setter. quickTo restarts its tween on every
    // call, so driving it once per frame with an unchanged value leaves the
    // element perpetually easing and never arriving.
    const sent = { x: 0, y: 0, rx: 0, ry: 0 };
    const CHANGED = 0.05;

    const send = (x: number, y: number, rx: number, ry: number) => {
      if (Math.abs(x - sent.x) > CHANGED) {
        sent.x = x;
        moveX(x);
      }
      if (Math.abs(y - sent.y) > CHANGED) {
        sent.y = y;
        moveY(y);
      }
      if (Math.abs(rx - sent.rx) > CHANGED) {
        sent.rx = rx;
        tiltX(rx);
      }
      if (Math.abs(ry - sent.ry) > CHANGED) {
        sent.ry = ry;
        tiltY(ry);
      }
    };

    const unsubscribe = subscribeToPointerFrame((_time, pointer) => {
      if (!pointer.seen || !pointer.fine) return;

      const rect = element.getBoundingClientRect();
      if (rect.width === 0) return;

      // getBoundingClientRect reports the transformed box, so measuring
      // against it while the element is being moved is a feedback loop that
      // settles somewhere arbitrary. Subtract what we applied to get the
      // element's resting geometry back.
      const appliedX = gsap.getProperty(element, "x") as number;
      const appliedY = gsap.getProperty(element, "y") as number;
      const left = rect.left - appliedX;
      const top = rect.top - appliedY;
      const right = left + rect.width;
      const bottom = top + rect.height;

      const centreX = left + rect.width / 2;
      const centreY = top + rect.height / 2;

      // Distance to the element's bounds, not its centre, so a wide button is
      // magnetic along its whole edge rather than only in the middle.
      const dx = Math.max(left - pointer.x, 0, pointer.x - right);
      const dy = Math.max(top - pointer.y, 0, pointer.y - bottom);
      const edgeDistance = Math.hypot(dx, dy);

      if (edgeDistance > RANGE) {
        send(0, 0, 0, 0);
        return;
      }

      const pull = 1 - edgeDistance / RANGE;
      const offsetX = Math.max(
        -1,
        Math.min(1, (pointer.x - centreX) / (rect.width / 2 || 1))
      );
      const offsetY = Math.max(
        -1,
        Math.min(1, (pointer.y - centreY) / (rect.height / 2 || 1))
      );

      send(
        offsetX * MAX_SHIFT * pull,
        offsetY * MAX_SHIFT * pull,
        // Tilt opposes the vertical offset so the near edge lifts toward the
        // cursor rather than away from it.
        -offsetY * MAX_TILT * pull,
        offsetX * MAX_TILT * pull
      );
    });

    return () => {
      unsubscribe();
      activeCount -= 1;
      gsap.killTweensOf(element);
      gsap.set(element, {
        clearProps: "x,y,rotationX,rotationY,transformPerspective",
      });
    };
  }, []);

  return ref;
}
