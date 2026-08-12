"use client";

import React, { useEffect, useRef } from "react";
import {
  acquireFrames,
  clearAnchor,
  publishAnchor,
} from "./sceneStore";

/**
 * A DOM element that reserves space for something the canvas will draw.
 *
 * It publishes its own screen rect so the scene can sit exactly where the
 * layout says it should, and it holds a frame lease only while it is actually
 * on screen. Scroll past it and the canvas stops rendering.
 */
export function SceneAnchor({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let release: (() => void) | null = null;
    let visible = false;
    let frame = 0;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      publishAnchor(id, {
        centreX: rect.left + rect.width / 2,
        centreY: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        // How far the anchor has travelled up and out of the viewport.
        faded: Math.min(
          Math.max(-rect.bottom / Math.max(window.innerHeight, 1), 0) * 2,
          1
        ),
        visible,
      });
      frame = requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;

        if (visible && !release) {
          release = acquireFrames();
        } else if (!visible && release) {
          release();
          release = null;
        }
      },
      { rootMargin: "10% 0px" }
    );

    observer.observe(element);
    frame = requestAnimationFrame(measure);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      release?.();
      clearAnchor(id);
    };
  }, [id]);

  return <div ref={ref} aria-hidden="true" className={className} />;
}
