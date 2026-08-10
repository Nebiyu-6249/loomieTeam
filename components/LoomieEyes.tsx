"use client";

import React, { useEffect, useRef } from "react";
import { subscribeToPointerFrame, type PointerState } from "./pointerStore";

/**
 * The mark, with optional cursor tracking.
 *
 * Pointer position and the frame loop come from the shared pointerStore, so
 * however many instances are mounted there is still exactly one listener and
 * one rAF loop for the whole application, shared with the magnetic elements
 * and the tilting work cards.
 */

/** Exact 5.142857x scale of the 70x36 LoomieLogoMark geometry. */
const VIEWBOX_WIDTH = 360;
const VIEWBOX_HEIGHT = 185;

/**
 * The original 18px cap was tuned against this 360-unit viewBox. Holding it
 * as a fraction of the viewBox width means the offset is expressed in
 * viewBox units, so a 56px navbar mark and a 340px blueprint deflect by the
 * same proportion of their own size.
 */
const MAX_OFFSET = VIEWBOX_WIDTH * 0.05;

/** Cursor distance, in screen pixels, at which deflection reaches the cap. */
const SATURATION_DISTANCE = 300;

const LERP = 0.12;

interface EyeInstance {
  svg: SVGSVGElement;
  left: SVGCircleElement;
  right: SVGCircleElement;
  current: { x: number; y: number };
  /** Cached so the blink styles are only written when they change. */
  blinkScale: number;
}

const instances = new Set<EyeInstance>();

/** Slow drift for touch devices and for before the cursor has ever moved. */
const idleTarget = (time: number) => ({
  x: Math.sin(time * 0.0006) * MAX_OFFSET * 0.6,
  y: Math.cos(time * 0.00042) * MAX_OFFSET * 0.45,
});

/** How much of the cap scroll position alone can claim. */
const SCROLL_INFLUENCE = 0.35;

/**
 * A vertical bias from scroll progress through the document, so the eyes drift
 * downward as the page advances. This is the motif that carries between
 * sections; it is added to the cursor target and the total is re-clamped.
 */
const scrollBias = () => {
  const scrollable =
    document.documentElement.scrollHeight - window.innerHeight;

  if (scrollable <= 0) return 0;

  const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
  return (progress - 0.5) * 2 * MAX_OFFSET * SCROLL_INFLUENCE;
};

/**
 * Idle behaviour: after eight seconds without pointer movement the eyes glance
 * away and blink, then return. Small, and it stops the page feeling like it is
 * waiting for you.
 */
const IDLE_AFTER_MS = 8000;
const GLANCE_PERIOD_MS = 5200;

const idleGlance = (idleFor: number) => {
  const since = idleFor - IDLE_AFTER_MS;
  if (since < 0) return null;

  const phase = (since % GLANCE_PERIOD_MS) / GLANCE_PERIOD_MS;

  // Glance away, hold, drift back, then a blink at the end of the cycle.
  const away = Math.sin(phase * Math.PI) ** 2;
  const blink = phase > 0.86 && phase < 0.94;

  return {
    x: away * MAX_OFFSET * 0.8,
    y: away * MAX_OFFSET * -0.3,
    blink,
  };
};

const applyFrame = (time: number, pointer: Readonly<PointerState>) => {
  const tracking = pointer.seen && pointer.fine;
  const bias = scrollBias();
  const glance = tracking ? idleGlance(pointer.idleFor) : null;

  instances.forEach((instance) => {
    let targetX: number;
    let targetY: number;

    if (glance) {
      targetX = glance.x;
      targetY = glance.y;
    } else if (tracking) {
      // Each instance measures its own position, so marks in different
      // places look in different directions.
      const rect = instance.svg.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);

      if (distance < 0.001) {
        targetX = 0;
        targetY = 0;
      } else {
        const strength = Math.min(distance / SATURATION_DISTANCE, 1);
        targetX = (dx / distance) * MAX_OFFSET * strength;
        targetY = (dy / distance) * MAX_OFFSET * strength;
      }
    } else {
      const idle = idleTarget(time);
      targetX = idle.x;
      targetY = idle.y;
    }

    targetY += bias;

    // Re-clamp, since the scroll bias can push the vector past the cap.
    const magnitude = Math.hypot(targetX, targetY);
    if (magnitude > MAX_OFFSET) {
      targetX = (targetX / magnitude) * MAX_OFFSET;
      targetY = (targetY / magnitude) * MAX_OFFSET;
    }

    instance.current.x += (targetX - instance.current.x) * LERP;
    instance.current.y += (targetY - instance.current.y) * LERP;

    const transform = `translate(${instance.current.x.toFixed(2)} ${instance.current.y.toFixed(2)})`;
    instance.left.setAttribute("transform", transform);
    instance.right.setAttribute("transform", transform);

    // The blink is a vertical squash of the apertures.
    const scale = glance?.blink ? 0.08 : 1;
    if (instance.blinkScale !== scale) {
      instance.blinkScale = scale;
      const squash = `scale(1 ${scale})`;
      instance.left.style.transformOrigin = "113px 92.5px";
      instance.right.style.transformOrigin = "247px 92.5px";
      instance.left.style.transform = squash;
      instance.right.style.transform = squash;
      instance.left.style.transition = "transform 90ms linear";
      instance.right.style.transition = "transform 90ms linear";
    }
  });
};

let unsubscribe: (() => void) | null = null;

const registerEyes = (instance: EyeInstance) => {
  instances.add(instance);

  if (!unsubscribe) {
    unsubscribe = subscribeToPointerFrame(applyFrame);
  }

  return () => {
    instances.delete(instance);

    if (instances.size === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

interface LoomieEyesProps {
  className?: string;
  track?: boolean;
  /** Supply only where the mark is the content; otherwise it stays decorative. */
  label?: string;
}

export function LoomieEyes({
  className = "w-12 h-6",
  track = true,
  label,
}: LoomieEyesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!track) return;

    // Under reduced motion the pupils stay where they render, which is centred.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const svg = svgRef.current;
    const left = leftPupilRef.current;
    const right = rightPupilRef.current;
    if (!svg || !left || !right) return;

    return registerEyes({
      svg,
      left,
      right,
      current: { x: 0, y: 0 },
      blinkScale: 1,
    });
  }, [track]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-colors duration-300`}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": "true" as const })}
    >
      <rect
        x="5"
        y="5"
        width="350"
        height="175"
        rx="87.5"
        className="fill-foreground stroke-foreground"
        strokeWidth="10"
      />
      <circle ref={leftPupilRef} cx="113" cy="92.5" r="46" className="fill-background" />
      <circle ref={rightPupilRef} cx="247" cy="92.5" r="46" className="fill-background" />
    </svg>
  );
}
