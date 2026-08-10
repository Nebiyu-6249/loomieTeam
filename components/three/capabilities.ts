"use client";

/**
 * What this device can be asked to render, decided once.
 *
 * Detection happens at mount and is cached for the session. Re-measuring on
 * resize would mean re-allocating buffers mid-scroll, which costs more than
 * the accuracy is worth.
 */

export const PARTICLE_BUDGET_DESKTOP = 8000;
export const PARTICLE_BUDGET_MOBILE = 2000;

/** Below this the perspective effects and the pinned exploded view are off. */
export const MOBILE_BREAKPOINT = 768;

export interface Capabilities {
  webgl: boolean;
  mobile: boolean;
  particles: number;
  /** MeshTransmissionMaterial is far too expensive for phone GPUs. */
  transmission: boolean;
}

let cached: Capabilities | null = null;

function detectWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!context) return false;

    // Release it immediately; holding a second context can starve the real one.
    const lose = (context as WebGLRenderingContext).getExtension(
      "WEBGL_lose_context"
    );
    lose?.loseContext();

    return true;
  } catch {
    return false;
  }
}

export function getCapabilities(): Capabilities {
  if (cached) return cached;

  const mobile = window.innerWidth < MOBILE_BREAKPOINT;

  cached = {
    webgl: detectWebgl(),
    mobile,
    particles: mobile ? PARTICLE_BUDGET_MOBILE : PARTICLE_BUDGET_DESKTOP,
    transmission: !mobile,
  };

  return cached;
}
