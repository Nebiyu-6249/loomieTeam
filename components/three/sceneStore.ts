"use client";

/**
 * The bridge between the DOM and the single shared canvas.
 *
 * Sections live in the document; the scene lives in one fixed canvas behind
 * everything. Sections publish where they are and whether they are on screen,
 * and the scene reads that to position and gate its content.
 *
 * Frame accounting lives here too: the canvas only runs a frame loop while at
 * least one section actually wants frames, so nothing renders behind content
 * the visitor is not looking at.
 */

export interface Anchor {
  /** Centre of the anchor in viewport pixels. */
  centreX: number;
  centreY: number;
  /** Anchor width in viewport pixels; the scene scales itself to match. */
  width: number;
  /** 0 while fully in place, 1 once scrolled a viewport past. */
  faded: number;
  visible: boolean;
}

const anchors = new Map<string, Anchor>();

export function publishAnchor(id: string, anchor: Anchor) {
  anchors.set(id, anchor);
}

export function clearAnchor(id: string) {
  anchors.delete(id);
}

export function readAnchor(id: string): Anchor | undefined {
  return anchors.get(id);
}

let wanted = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

/** Returns a release function. The loop stops when the last holder releases. */
export function acquireFrames() {
  wanted += 1;
  emit();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    wanted -= 1;
    emit();
  };
}

export function subscribeFrames(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function framesWanted() {
  return wanted > 0;
}

export function framesWantedServer() {
  return false;
}
