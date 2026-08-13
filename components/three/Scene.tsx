"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Canvas } from "@react-three/fiber";
import { getCapabilities } from "./capabilities";
import {
  framesWanted,
  framesWantedServer,
  loaderOwnsField,
  loaderOwnsFieldServer,
  subscribeFrames,
  subscribeLoader,
} from "./sceneStore";
import { Particles } from "./Particles";

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

/** Above the loading screen while it owns the field, behind the page after. */
const LOADER_LAYER = 1000000;
const PAGE_LAYER = -10;

export default function Scene() {
  const [hidden, setHidden] = useState(false);

  const wanted = useSyncExternalStore(
    subscribeFrames,
    framesWanted,
    framesWantedServer
  );

  /**
   * A10 puts the particle field on the loading screen rather than behind it,
   * so for the length of the loader the canvas sits above the overlay that is
   * covering the page. It drops behind the content the moment the field is
   * handed over.
   */
  const duringLoader = useSyncExternalStore(
    subscribeLoader,
    loaderOwnsField,
    loaderOwnsFieldServer
  );

  useEffect(() => {
    // Nothing renders while the tab is in the background. A river simulating
    // behind a tab nobody is looking at is pure battery.
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const capabilities = getCapabilities();
  const running = wanted && !hidden;

  return (
    <div
      data-scene-canvas=""
      data-scene-running={running ? "true" : "false"}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      /*
        Hidden whenever the loop is stopped. A canvas with frameloop "never"
        does not go blank — it keeps presenting whatever it drew last, so the
        particle field stayed frozen on screen behind every section after the
        loader dispersed it, which is exactly the permanent starfield this
        pass set out to remove.
      */
      style={{
        zIndex: duringLoader ? LOADER_LAYER : PAGE_LAYER,
        visibility: running ? "visible" : "hidden",
      }}
    >
      <Canvas
        // Never full resolution on a 3x display.
        dpr={[1, 2]}
        // Frames only while a section on screen has asked for them.
        frameloop={running ? "always" : "never"}
        gl={{
          antialias: !capabilities.mobile,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, 6], fov: 42 }}
        style={{ pointerEvents: "none" }}
      >
        <Particles />
      </Canvas>
    </div>
  );
}
