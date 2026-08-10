"use client";

import React, { useEffect, useMemo } from "react";
import { disposeGradientTexture, getGradientTexture } from "./gradientTexture";

/**
 * Environment lighting from a procedural gradient rather than an HDRI: no
 * binary asset, no network request, and it carries the same cold-to-warm story
 * as the page.
 *
 * Attached declaratively. Assigning scene.environment by hand means mutating a
 * value returned from useThree, which React Compiler rejects.
 *
 * Must be a direct child of Canvas so that attach targets the scene. Owns the
 * shared gradient texture: HeroLenses reads the same one as its backdrop.
 */
export function GradientEnvironment() {
  const texture = useMemo(() => getGradientTexture(), []);

  useEffect(() => disposeGradientTexture, []);

  if (!texture) return null;

  return <primitive object={texture} attach="environment" />;
}
