import React from "react";

/**
 * What renders when there is no canvas: no WebGL, reduced motion, or before
 * the 3D chunk has loaded.
 *
 * It matches the composition the canvas settles into rather than being blank,
 * so the page never shows a hole where the scene will be. Pure CSS, no
 * JavaScript, and cheap enough to leave mounted underneath the canvas.
 */

const noise = (n: number) => {
  const value = Math.sin(n * 91.7) * 34719.317;
  return value - Math.floor(value);
};

/** A sparse, still field. Suspended snow, which is where the page begins. */
const POINTS = Array.from({ length: 90 }, (_, i) => ({
  x: noise(i + 1) * 100,
  y: noise(i * 3.1 + 7) * 100,
  size: 1 + noise(i * 5.7 + 13) * 2.2,
  opacity: 0.12 + noise(i * 2.3 + 5) * 0.28,
}));

export function SceneFallback() {
  return (
    <div
      aria-hidden="true"
      data-scene-fallback=""
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {POINTS.map((point, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-foreground"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            width: `${point.size}px`,
            height: `${point.size}px`,
            opacity: point.opacity,
          }}
        />
      ))}
    </div>
  );
}
