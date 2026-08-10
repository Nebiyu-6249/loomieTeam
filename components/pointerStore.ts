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

let listenerHolders = 0;

/** Refcounted, so the one listener outlives any single consumer. */
const retainListener = () => {
  if (listenerHolders === 0) {
    state.fine = window.matchMedia("(pointer: fine)").matches;
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
  }

  listenerHolders += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    listenerHolders -= 1;

    if (listenerHolders === 0) {
      window.removeEventListener("pointermove", handlePointerMove);
    }
  };
};

const refreshIdle = () => {
  state.idleFor = state.seen ? performance.now() - lastMoveAt : 0;
};

const tick = (time: number) => {
  refreshIdle();
  subscribers.forEach((subscriber) => subscriber(time, state));
  frame = requestAnimationFrame(tick);
};

let releaseFrameListener: (() => void) | null = null;

/** Returns an unsubscribe function. The loop stops when the last one leaves. */
export function subscribeToPointerFrame(subscriber: FrameSubscriber) {
  subscribers.add(subscriber);

  if (!running) {
    releaseFrameListener = retainListener();
    frame = requestAnimationFrame(tick);
    running = true;
  }

  return () => {
    subscribers.delete(subscriber);

    if (subscribers.size === 0 && running) {
      releaseFrameListener?.();
      releaseFrameListener = null;
      cancelAnimationFrame(frame);
      running = false;
    }
  };
}

/**
 * For consumers that already have a frame loop of their own.
 *
 * The canvas renders on react-three-fiber's loop, and it cannot use the
 * pointer react-three-fiber provides: the canvas sits behind the page with
 * pointer-events none, so no pointer event ever reaches it and its own pointer
 * stays at the origin forever. Keeping the listener here means the whole
 * application still has exactly one.
 *
 * Returns a release function; pair it with readPointer.
 */
export function observePointer() {
  return retainListener();
}

export function readPointer(): Readonly<PointerState> {
  refreshIdle();
  return state;
}
