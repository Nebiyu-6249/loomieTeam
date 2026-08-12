/**
 * The six pieces of the brand system, and where they go.
 *
 * One table, read by both renderings of this section: the DOM one that runs
 * under reduced motion, on mobile and without WebGL, and the canvas one that
 * runs everywhere else. Two copies of these numbers would drift apart on the
 * first tweak.
 *
 * Explode vectors and grid cells are fractions of the stage box, and the y
 * axis points down here because that is what the DOM version needs. The 3D
 * side negates it.
 */

import type { PlateKind } from "./three/plateArt";

export interface BrandPlate {
  id: PlateKind;
  /** Named while exploded. */
  label: string;
  /** Named once locked. Four service names across six pieces. */
  service: string;
  /** Deliberately asymmetric. */
  explode: { x: number; y: number; rotate: number; scale: number };
  /** Column and row in the locked 3 x 2 grid. */
  cell: { column: number; row: number };
  /**
   * Depth at full explode, in units of the stage width. Signs alternate so
   * the plates pass through each other's depth rather than fanning out on
   * one plane — which is the whole reason this section is in 3D.
   */
  depth: number;
}

export const BRAND_PLATES: BrandPlate[] = [
  {
    id: "mark",
    label: "The mark",
    service: "Logo design",
    explode: { x: -0.34, y: -0.26, rotate: -9, scale: 1.12 },
    cell: { column: 0, row: 0 },
    depth: 0.34,
  },
  {
    id: "colour",
    label: "Colour",
    service: "Web brand identity",
    explode: { x: 0.31, y: -0.33, rotate: 7, scale: 0.94 },
    cell: { column: 1, row: 0 },
    depth: -0.22,
  },
  {
    id: "type",
    label: "Type",
    service: "Web brand identity",
    explode: { x: -0.38, y: 0.19, rotate: 5, scale: 1.04 },
    cell: { column: 2, row: 0 },
    depth: 0.18,
  },
  {
    id: "packaging",
    label: "Packaging",
    service: "Marketing design",
    explode: { x: 0.26, y: 0.31, rotate: -12, scale: 0.9 },
    cell: { column: 0, row: 1 },
    depth: -0.31,
  },
  {
    id: "social",
    label: "Social",
    service: "Marketing design",
    explode: { x: 0.06, y: -0.4, rotate: 14, scale: 0.86 },
    cell: { column: 1, row: 1 },
    depth: 0.26,
  },
  {
    id: "interface",
    label: "Interface",
    service: "Website design",
    explode: { x: -0.12, y: 0.38, rotate: -6, scale: 1 },
    cell: { column: 2, row: 1 },
    depth: -0.14,
  },
];

/** Fractions of the stage box used for the locked 3 x 2 grid. */
export const COLUMN_SPREAD = 0.32;
export const ROW_SPREAD = 0.23;

/** Plate width as a fraction of the stage width, matching md:w-[26%]. */
export const PLATE_SPAN = 0.26;
