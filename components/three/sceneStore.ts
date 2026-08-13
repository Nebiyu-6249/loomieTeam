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
  /** Anchor size in viewport pixels; the scene scales itself to match. */
  width: number;
  height: number;
  /** 0 while fully in place, 1 once scrolled a viewport past. */
  faded: number;
  /**
   * How much of the anchor is inside the viewport, 0 to 1.
   *
   * `visible` is a yes/no from an IntersectionObserver with margin, which is
   * the right signal for holding a frame lease and the wrong one for drawing:
   * the canvas is one fixed full-screen layer, so anything it renders covers
   * the whole viewport regardless of where its anchor is. Gated on `visible`
   * alone the particle field kept painting across the section below while its
   * own section was two-thirds gone. This is the number that fades it out.
   */
  presence: number;
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

/**
 * How far a scroll-scrubbed section has run, 0 to 1.
 *
 * The pin and the scrub stay in GSAP, where the rest of the site's
 * scroll work lives; the scene only reads the number. Nothing in the canvas
 * needs to know what a ScrollTrigger is.
 */
const sectionProgress = new Map<string, number>();

export function publishProgress(id: string, value: number) {
  sectionProgress.set(id, value);
}

export function readProgress(id: string): number {
  return sectionProgress.get(id) ?? 0;
}

export function clearProgress(id: string) {
  sectionProgress.delete(id);
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

/**
 * The loading screen's hold on the particle field.
 *
 * A10 makes the loader the page's first frame rather than a screen in front
 * of it, so the loader drives the same points the page then inherits.
 *
 * The default is "the page owns the field". A loader that decides to play
 * claims it; one that never mounts — a client-side navigation, a repeat load,
 * reduced motion — leaves the field in its scroll state, which is what should
 * be on screen in all three cases.
 */
export interface LoaderState {
  /** 0 to 1 as the counter climbs: scattered to mark. */
  form: number;
  /** 0 while the loader owns the field, 1 once the page does. */
  handoff: number;
}

const loader: LoaderState = { form: 0, handoff: 1 };

const loaderListeners = new Set<() => void>();

export function publishLoader(next: LoaderState) {
  const changed =
    // The z-index switch only cares about crossing into or out of the
    // handoff, so per-frame form updates must not wake React.
    (loader.handoff >= 1) !== (next.handoff >= 1);

  loader.form = next.form;
  loader.handoff = next.handoff;

  if (changed) loaderListeners.forEach((listener) => listener());
}

export function readLoader(): Readonly<LoaderState> {
  return loader;
}

export function subscribeLoader(listener: () => void) {
  loaderListeners.add(listener);
  return () => loaderListeners.delete(listener);
}

export function loaderOwnsField() {
  return loader.handoff < 1;
}

export function loaderOwnsFieldServer() {
  return false;
}

/**
 * When the canvas is actually drawing, as opposed to merely mounted.
 *
 * The loading screen cannot simply assume the particle mark is there. The
 * scene arrives on a dynamic import, then has to build a WebGL context and
 * compile a shader, and on a slow machine all of that can outlast the loader
 * — which is how the loading screen ends up showing a bare counter and no
 * mark at all. Measured on a software renderer, the canvas's first frame
 * landed after the loader had already finished.
 *
 * So the drawn mark holds the position until this fires, and only then hands
 * over. If it never fires — no WebGL, or a machine too slow to matter — the
 * drawn mark simply stays, which is the correct outcome rather than a
 * fallback.
 */
let sceneDrawing = false;
let drawingWaiters: Array<() => void> = [];

export function markSceneDrawing() {
  if (sceneDrawing) return;
  sceneDrawing = true;

  const pending = drawingWaiters;
  drawingWaiters = [];
  pending.forEach((resolve) => resolve());
}

export function whenSceneDrawing(): Promise<void> {
  if (sceneDrawing) return Promise.resolve();
  return new Promise<void>((resolve) => {
    drawingWaiters.push(resolve);
  });
}
