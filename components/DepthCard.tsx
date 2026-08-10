"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * A9 — work card depth.
 *
 * Hovering a case study card tilts it toward the cursor while its layers
 * separate: the image sinks back, the title lifts forward, a shadow appears
 * beneath. Releasing settles it with a small overshoot.
 *
 * CSS 3D transforms, not WebGL. The whole effect is four transforms and a
 * box-shadow, and it costs nothing next to a canvas.
 *
 * Children opt into a layer with data-depth="back" or data-depth="front".
 */

const PERSPECTIVE = 1200;
/** Degrees. Past about 8 it stops reading as depth and starts reading as a bug. */
const MAX_TILT = 6;
const BACK_Z = -34;
const FRONT_Z = 46;

const ENTER_DURATION = 0.35;
const SETTLE_DURATION = 0.55;

export function DepthCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    // Pointer-driven tilt needs a pointer, and reduced motion needs stillness.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const back = frame.querySelectorAll<HTMLElement>('[data-depth="back"]');
    const front = frame.querySelectorAll<HTMLElement>('[data-depth="front"]');

    // GSAP's transform properties are rotationX/rotationY. rotateX/rotateY are
    // not recognised and get written as unknown CSS properties, which silently
    // does nothing.
    const tiltX = gsap.quickTo(frame, "rotationX", {
      duration: ENTER_DURATION,
      ease: "power3.out",
    });
    const tiltY = gsap.quickTo(frame, "rotationY", {
      duration: ENTER_DURATION,
      ease: "power3.out",
    });

    const onEnter = () => {
      gsap.to(back, { z: BACK_Z, duration: ENTER_DURATION, ease: "power3.out" });
      gsap.to(front, {
        z: FRONT_Z,
        duration: ENTER_DURATION,
        ease: "power3.out",
      });
      gsap.to(frame, {
        boxShadow: "0 30px 60px -24px rgba(0,0,0,0.55)",
        duration: ENTER_DURATION,
        ease: "power3.out",
      });
    };

    const onMove = (event: PointerEvent) => {
      const rect = frame.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      tiltX(-y * MAX_TILT * 2);
      tiltY(x * MAX_TILT * 2);
    };

    const onLeave = () => {
      // The overshoot is what makes it feel like a physical card settling.
      gsap.to(frame, {
        rotationX: 0,
        rotationY: 0,
        boxShadow: "0 0px 0px 0px rgba(0,0,0,0)",
        duration: SETTLE_DURATION,
        ease: "back.out(1.4)",
      });
      gsap.to([...back, ...front], {
        z: 0,
        duration: SETTLE_DURATION,
        ease: "back.out(1.4)",
      });
    };

    frame.addEventListener("pointerenter", onEnter);
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerleave", onLeave);

    return () => {
      frame.removeEventListener("pointerenter", onEnter);
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf([frame, ...back, ...front]);
      gsap.set(frame, { clearProps: "rotationX,rotationY,boxShadow" });
      gsap.set([...back, ...front], { clearProps: "z" });
    };
  }, []);

  return (
    <div style={{ perspective: `${PERSPECTIVE}px` }} className={className}>
      <div
        ref={frameRef}
        data-depth-frame=""
        className="h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}
