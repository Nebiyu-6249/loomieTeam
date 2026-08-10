"use client";

import * as THREE from "three";

/**
 * The scene's only image asset, drawn rather than downloaded.
 *
 * A 64x32 equirectangular gradient running cold blue to charcoal to gold: the
 * same snow-to-river story the page tells, used both as the environment map
 * and as the backdrop the ice refracts. No HDRI, no network request, no binary
 * in the repo.
 *
 * It is a singleton because two consumers need the identical texture and
 * uploading the same gradient to the GPU twice is waste. GradientEnvironment
 * owns the lifecycle; it and HeroLenses mount and unmount together under the
 * one Canvas.
 */

const WIDTH = 64;
const HEIGHT = 32;

/**
 * Sky to horizon to ground. The horizon band is deliberately narrow: a wide
 * dark middle is what the ice looks straight through, and it turns clear
 * lenses into grey pebbles.
 */
const STOPS: [number, string][] = [
  [0, "#CBDDF0"],
  [0.34, "#7FA0C4"],
  [0.62, "#37414F"],
  [0.8, "#A89A63"],
  [1, "#E8DFA0"],
];

let texture: THREE.CanvasTexture | null = null;

export function getGradientTexture(): THREE.CanvasTexture | null {
  if (texture) return texture;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  for (const [offset, colour] of STOPS) gradient.addColorStop(offset, colour);
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function disposeGradientTexture() {
  texture?.dispose();
  texture = null;
}
