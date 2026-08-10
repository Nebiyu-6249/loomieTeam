"use client";

import React, { useEffect, useRef } from "react";

/**
 * The mark, with optional cursor tracking.
 *
 * Cursor position lives in a single module-level store with exactly one
 * mousemove listener and one requestAnimationFrame loop for the whole app,
 * however many instances are mounted. Instances register themselves on mount
 * and the listener and loop are torn down when the last one unregisters.
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
}

const instances = new Set<EyeInstance>();

const pointer = { x: 0, y: 0, seen: false };

let frame = 0;
let running = false;
let hasFinePointer = true;

const handlePointerMove = (event: MouseEvent) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.seen = true;
};

/** Slow drift for touch devices and for before the cursor has ever moved. */
const idleTarget = (time: number) => ({
  x: Math.sin(time * 0.0006) * MAX_OFFSET * 0.6,
  y: Math.cos(time * 0.00042) * MAX_OFFSET * 0.45,
});

const tick = (time: number) => {
  const tracking = pointer.seen && hasFinePointer;

  instances.forEach((instance) => {
    let targetX: number;
    let targetY: number;

    if (tracking) {
      // Each instance measures its own position, so marks in different
      // places on screen look in different directions.
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

    instance.current.x += (targetX - instance.current.x) * LERP;
    instance.current.y += (targetY - instance.current.y) * LERP;

    const transform = `translate(${instance.current.x.toFixed(2)} ${instance.current.y.toFixed(2)})`;
    instance.left.setAttribute("transform", transform);
    instance.right.setAttribute("transform", transform);
  });

  frame = requestAnimationFrame(tick);
};

const registerEyes = (instance: EyeInstance) => {
  instances.add(instance);

  if (!running) {
    hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    frame = requestAnimationFrame(tick);
    running = true;
  }

  return () => {
    instances.delete(instance);

    if (instances.size === 0 && running) {
      window.removeEventListener("mousemove", handlePointerMove);
      cancelAnimationFrame(frame);
      running = false;
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

    return registerEyes({ svg, left, right, current: { x: 0, y: 0 } });
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
