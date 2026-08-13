/**
 * ── PLACEHOLDER CONTENT ──────────────────────────────────────────────────
 * Awaiting real partner logos.
 *
 * Every name and mark below is invented for layout purposes. No third-party
 * logo, wordmark or trademark is referenced, downloaded or embedded, and none
 * should be added to this array — the marks are drawn from primitives in the
 * current text colour precisely so that nothing real is implied.
 *
 * Replacing them means editing this array and nothing else. Until then the
 * belt is deliberately quiet: placeholder names are not a trust signal, and
 * presenting them as one would be the least honest thing on the site.
 */

export interface Partner {
  id: string;
  name: string;
  /** Drawn against a 20 x 24 box, in currentColor. */
  path: {
    kind: "polygon" | "circle" | "path" | "bars" | "pair";
  };
}

export const PARTNERS: Partner[] = [
  { id: "northwind", name: "Northwind", path: { kind: "polygon" } },
  { id: "atlas-co", name: "Atlas Co", path: { kind: "circle" } },
  { id: "meridian", name: "Meridian", path: { kind: "bars" } },
  { id: "kestrel", name: "Kestrel", path: { kind: "path" } },
  { id: "halvard", name: "Halvard", path: { kind: "bars" } },
  { id: "oakline", name: "Oakline", path: { kind: "pair" } },
];
