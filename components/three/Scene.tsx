"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { getCapabilities } from "./capabilities";
import {
  framesWanted,
  framesWantedServer,
  subscribeFrames,
} from "./sceneStore";
import { GradientEnvironment } from "./GradientEnvironment";
import { HeroLenses } from "./HeroLenses";

/**
 * The single canvas for the whole application.
 *
 * One canvas, mounted once, fixed behind all content and transparent to the
 * pointer. Every 3D effect on the site renders into this one; a canvas per
 * section is how a page ends up with six WebGL contexts and no frame budget.
 *
 * This module and its children are the only place @react-three/fiber is
 * imported, and they are only reachable through SceneRoot's dynamic import, so
 * none of three.js lands in the main bundle.
 */

export default function Scene() {
  const [hidden, setHidden] = useState(false);

  const wanted = useSyncExternalStore(
    subscribeFrames,
    framesWanted,
    framesWantedServer
  );

  useEffect(() => {
    // Nothing renders while the tab is in the background. A river simulating
    // behind a tab nobody is looking at is pure battery.
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const capabilities = getCapabilities();

  return (
    <div
      data-scene-canvas=""
      data-scene-running={wanted && !hidden ? "true" : "false"}
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none"
    >
      <Canvas
        // Never full resolution on a 3x display.
        dpr={[1, 2]}
        // Frames only while a section on screen has asked for them.
        frameloop={wanted && !hidden ? "always" : "never"}
        gl={{
          antialias: !capabilities.mobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, 6], fov: 42 }}
        style={{ pointerEvents: "none" }}
      >
        {/* Direct child of Canvas so attach targets the scene. */}
        <GradientEnvironment />
        <HeroLenses />
      </Canvas>
    </div>
  );
}
