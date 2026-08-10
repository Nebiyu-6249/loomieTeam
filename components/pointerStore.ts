"use client";

/**
 * One pointer listener and one animation frame loop for the whole application.
 *
 * The eyes track the cursor, magnetic elements lean toward it, and work cards
 * tilt to it. Each of those wanting its own listener and its own rAF loop is
 * how a page ends up running six loops to do one thing.
 */

export interface PointerState {
  /** Viewport coordinates. */
  x: number;
  y: number;
  /** False until the pointer has actually moved. */
  seen: boolean;
  /** A real cursor, as opposed to touch. Read once, at first subscribe. */
  fine: boolean;
  /** Milliseconds since the last movement. */
  idleFor: number;
}

const state: PointerState = {
  x: 0,
  y: 0,
  seen: false,
  fine: true,
  idleFor: 0,
};

type FrameSubscriber = (time: number, pointer: Readonly<PointerState>) => void;

const subscribers = new Set<FrameSubscriber>();

let frame = 0;
let running = false;
let lastMoveAt = 0;

const handlePointerMove = (event: PointerEvent) => {
  state.x = event.clientX;
  state.y = event.clientY;
  state.seen = true;
  lastMoveAt = performance.now();
};

const tick = (time: number) => {
  state.idleFor = state.seen ? performance.now() - lastMoveAt : 0;
  subscribers.forEach((subscriber) => subscriber(time, state));
  frame = requestAnimationFrame(tick);
};

/** Returns an unsubscribe function. The loop stops when the last one leaves. */
export function subscribeToPointerFrame(subscriber: FrameSubscriber) {
  subscribers.add(subscriber);

  if (!running) {
    state.fine = window.matchMedia("(pointer: fine)").matches;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    frame = requestAnimationFrame(tick);
    running = true;
  }

  return () => {
    subscribers.delete(subscriber);

    if (subscribers.size === 0 && running) {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frame);
      running = false;
    }
  };
}
