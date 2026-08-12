"use client";

/**
 * The three shapes the particle field moves between.
 *
 * A3 is a blend between two precomputed sets — a suspended cloud and a
 * parametric river — and A10 adds the third, the mark itself, which the
 * loader assembles before handing the same points to the page.
 *
 * Everything here is in normalised viewport units: x and y run -0.5 to 0.5
 * across the viewport, so the field is resolution independent and the object
 * is simply scaled to the viewport each frame. Nothing is recomputed on
 * resize.
 */

/** Deterministic, so a reload produces the same field and never a jump. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 360x185 LoomieEyes viewBox, normalised to a unit-wide mark. */
const MARK_HALF_HEIGHT = 92.5 / 360;
const MARK_STRAIGHT = (360 - 185) / 2 / 360;
const APERTURE_OFFSET = (180 - 113) / 360;
const APERTURE_RADIUS = 46 / 360;

/**
 * CSS pixels, matching the loading screen's w-40 and w-64 mark exactly. A
 * share of the viewport was the first attempt and it drifts away from the
 * drawn mark on any screen that is not the one it was tuned on, which shows
 * up the moment the two are cross-faded.
 */
export const MARK_PIXELS_MOBILE = 160;
export const MARK_PIXELS_DESKTOP = 256;

/** Inside the stadium, outside the two apertures: the mark's filled area. */
function insideMark(x: number, y: number): boolean {
  if (Math.abs(y) > MARK_HALF_HEIGHT) return false;

  const overhang = Math.abs(x) - MARK_STRAIGHT;
  if (overhang > 0) {
    // Past the straight section, the ends are half-circles.
    if (overhang * overhang + y * y > MARK_HALF_HEIGHT * MARK_HALF_HEIGHT) {
      return false;
    }
  }

  for (const centre of [-APERTURE_OFFSET, APERTURE_OFFSET]) {
    const dx = x - centre;
    if (dx * dx + y * y < APERTURE_RADIUS * APERTURE_RADIUS) return false;
  }

  return true;
}

export interface ParticleField {
  /** Suspended cloud. This is the position attribute. */
  snow: Float32Array;
  /** Parametric river curve. */
  river: Float32Array;
  /** The mark, for the loader. */
  mark: Float32Array;
  /** x: drift phase, y: size and stagger, z: base alpha. */
  seed: Float32Array;
}

/**
 * The mark is stored spanning -0.5 to 0.5 in x and scaled in the shader, so
 * its on-screen size is a pixel measurement rather than something baked into
 * a buffer at build time.
 */
export function buildParticleField(count: number): ParticleField {
  const random = mulberry32(0x10031e);

  const snow = new Float32Array(count * 3);
  const river = new Float32Array(count * 3);
  const mark = new Float32Array(count * 3);
  const seed = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;

    // Suspended cloud, a little wider than the viewport so the edges are not
    // visibly empty when the field drifts.
    snow[i3] = (random() - 0.5) * 1.15;
    snow[i3 + 1] = (random() - 0.5) * 1.25;
    snow[i3 + 2] = -0.4 + random() * 0.55;

    // The river. A meander across the viewport, receding as it goes, with the
    // band thickest in the middle so it reads as a body of water rather than
    // a drawn line.
    const t = i / Math.max(count - 1, 1);
    const across = t * 1.35 - 0.675;
    const meander =
      Math.sin(t * Math.PI * 1.7) * 0.2 + Math.sin(t * Math.PI * 4.3) * 0.04;
    const bank = Math.sin(t * Math.PI) * 0.085 + 0.02;

    river[i3] = across;
    river[i3 + 1] = meander + (random() - 0.5) * 2 * bank;
    river[i3 + 2] = -0.15 - t * 0.35 + (random() - 0.5) * 0.06;

    // The mark. Rejection sampling against the real silhouette, with a cap so
    // a pathological run can never spin.
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 64; attempt += 1) {
      x = (random() - 0.5) * 1.02;
      y = (random() - 0.5) * 2 * (MARK_HALF_HEIGHT + 0.01);
      if (insideMark(x, y)) break;
    }

    mark[i3] = x;
    mark[i3 + 1] = y;
    mark[i3 + 2] = (random() - 0.5) * 0.05;

    seed[i3] = random();
    seed[i3 + 1] = random();
    seed[i3 + 2] = 0.35 + random() * 0.65;
  }

  return { snow, river, mark, seed };
}
