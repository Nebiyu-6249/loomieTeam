"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { getCapabilities } from "./capabilities";

/**
 * The single canvas for the whole application.
 *
 * One canvas, mounted once, fixed behind all content and transparent to the
 * pointer. Every 3D effect on the site renders into this one; a canvas per
 * section is how a page ends up with six WebGL contexts and no frame budget.
 *
 * This module is the only place that imports @react-three/fiber, and it is
 * only ever reached through SceneRoot's dynamic import, so none of three.js
 * lands in the main bundle.
 */

export default function Scene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<"always" | "demand" | "never">(
    "demand"
  );

  useEffect(() => {
    // Nothing renders while the tab is in the background. A river simulating
    // behind a tab nobody is looking at is pure battery.
    const onVisibility = () => {
      setFrameloop(document.hidden ? "never" : "demand");
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const capabilities = getCapabilities();

  return (
    <div
      ref={hostRef}
      data-scene-canvas=""
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
    >
      <Canvas
        // Never full resolution on a 3x display.
        dpr={[1, 2]}
        frameloop={frameloop}
        gl={{
          antialias: !capabilities.mobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, 6], fov: 42 }}
        style={{ pointerEvents: "none" }}
      >
        {/*
          Sections register their content here in later tasks. The canvas
          itself is deliberately empty for now: this task is the mount, the
          budgets and the fallbacks, not the scene.
        */}
      </Canvas>
    </div>
  );
}
